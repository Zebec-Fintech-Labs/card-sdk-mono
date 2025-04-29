import { AxiosError, AxiosResponse } from "axios";
import { ethers } from "ethers";

import { ERC20, ERC20__factory, ZebecCard, ZebecCard__factory } from "../artifacts";
import { parseSupportedChain, SupportedChain, TESTNET_CHAINIDS } from "../chains";
import { PLATFORM_FEE, USDC_ADDRESS, ZEBEC_CARD_ADDRESS } from "../constants";
import {
	CardPurchaseAmountOutOfRangeError,
	DailyCardPurchaseLimitExceedError,
	InvalidEmailError,
	NotEnoughBalanceError,
} from "../errors";
import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { Deposit, Money, OrderCardRequest, Quote, Receipt, Recipient } from "../types";
import { areDatesOfSameDay, formatAmount, hashSHA256, isEmailValid } from "../utils";

export class ZebecCardService {
	readonly zebecCard: ZebecCard;
	readonly usdcToken: ERC20;
	readonly chainId: SupportedChain;
	private readonly apiService: ZebecCardAPIService;

	constructor(
		readonly signer: ethers.Signer,
		chainId: number,
		apiConfig: APIConfig,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		const sandbox = sdkOptions?.sandbox ? sdkOptions.sandbox : false;
		this.chainId = parseSupportedChain(chainId);

		const isTesnetChainId = TESTNET_CHAINIDS.includes(this.chainId);

		if ((sandbox && !isTesnetChainId) || (!sandbox && isTesnetChainId)) {
			throw new Error("Only testnet chains are allowed in sandbox environment");
		}

		this.apiService = new ZebecCardAPIService(apiConfig, sandbox);

		const zebecCardAddress = ZEBEC_CARD_ADDRESS[this.chainId];
		const usdcAddress = USDC_ADDRESS[this.chainId];

		this.zebecCard = ZebecCard__factory.connect(zebecCardAddress, signer);
		this.usdcToken = ERC20__factory.connect(usdcAddress, signer);
	}

	/**
	 * Fetches a quote for the given amount.
	 *
	 * @param {string | number} amount - The amount for which to fetch the quote.
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote() {
		const res = await this.apiService.fetchQuote("USDC");
		return res as Quote;
	}

	/**
	 * Transfer specified amount from user's vault balance to card vault with some fee amount for card purchase.
	 * @param params
	 * @returns
	 */
	async purchaseCard(params: {
		amount: number;
		recipient: Recipient;
		quote: Quote;
	}): Promise<
		[ethers.ContractTransactionResponse, ethers.ContractTransactionResponse, AxiosResponse]
	> {
		// Check card service status
		await this.apiService.ping();

		const decimals = await this.usdcToken.decimals();
		const totalAmount = formatAmount(params.amount + PLATFORM_FEE, Number(decimals));
		const parsedAmount = ethers.parseUnits(totalAmount.toString(), decimals);
		if (!isEmailValid(params.recipient.emailAddress)) {
			throw new InvalidEmailError(params.recipient.emailAddress);
		}

		const usdcBalance = await this.usdcToken.balanceOf(this.signer);
		console.debug("Usdc Balance:", usdcBalance);

		if (parsedAmount > usdcBalance) {
			throw new NotEnoughBalanceError(
				ethers.formatUnits(usdcBalance, decimals),
				params.amount.toString(),
			);
		}

		let cardConfig = await this.zebecCard.cardConfig();
		const minRange = cardConfig.minCardAmount;
		const maxRange = cardConfig.maxCardAmount;

		if (parsedAmount < minRange || parsedAmount > maxRange) {
			throw new CardPurchaseAmountOutOfRangeError(
				ethers.formatUnits(minRange, decimals),
				ethers.formatUnits(maxRange, decimals),
			);
		}

		const cardPurchaseInfo = await this.zebecCard.cardPurchases(this.signer);
		const lastCardPurchaseDate = new Date(Number(cardPurchaseInfo.unixInRecord * 1000n));
		const today = new Date();

		let cardPurchaseOfDay = 0n;
		if (areDatesOfSameDay(today, lastCardPurchaseDate)) {
			cardPurchaseOfDay = cardPurchaseInfo.totalCardBoughtPerDay + parsedAmount;
		} else {
			cardPurchaseOfDay = parsedAmount;
		}

		if (cardPurchaseOfDay > cardConfig.dailyCardBuyLimit) {
			throw new DailyCardPurchaseLimitExceedError(
				ethers.formatUnits(cardConfig.dailyCardBuyLimit, decimals),
				ethers.formatUnits(cardPurchaseInfo.totalCardBoughtPerDay, decimals),
			);
		}

		const allowance = await this.usdcToken.allowance(this.signer, this.zebecCard);
		console.debug("Allowance:", allowance);

		if (allowance < parsedAmount) {
			console.debug("===== Approving token =====");
			const approveResponse = await this.usdcToken.approve(this.zebecCard, parsedAmount);
			const approveReceipt = await approveResponse.wait();
			console.debug("Approve hash: %s \n", approveReceipt?.hash);
		}

		console.debug("===== Depositing USDC =====");
		const depositResponse = await this.zebecCard.depositUsdc(parsedAmount);
		const depositReceipt = await depositResponse.wait();
		console.debug("Deposit hash: %s \n", depositReceipt?.hash);

		cardConfig = await this.zebecCard.cardConfig();
		const purchaseCounter = Number((cardConfig.counter + 1n).toString());

		const cardTypeId = "103253238082";
		const emailHash = await hashSHA256(params.recipient.emailAddress);

		console.debug("===== Purchasing Card =====");
		const buyCardResponse = await this.zebecCard.buyCard(parsedAmount, cardTypeId, emailHash);
		const buyCardReceipt = await buyCardResponse.wait();
		console.debug("Purchase hash: %s \n", buyCardReceipt?.hash);

		const usdAmount = Money.USD(params.amount);
		const buyer = await this.signer.getAddress();
		const receipt = new Receipt(
			params.quote,
			new Deposit(
				"USDC",
				Number(totalAmount),
				"",
				buyer,
				buyCardResponse.hash,
				"",
				this.chainId,
				purchaseCounter,
			),
		);
		const payload = new OrderCardRequest(usdAmount, params.recipient, receipt);

		let retries = 0;
		let delay = 1000; // Initial delay in milliseconds (1 second)
		const maxRetries = 5; // Max retry default

		while (retries < maxRetries) {
			try {
				const response = await this.apiService.purchaseCard(payload);
				console.debug("API response: %o \n", response.data);

				return [depositResponse, buyCardResponse, response];
			} catch (error) {
				if (error instanceof AxiosError) {
					console.debug("error", error.response?.data);
					console.debug("error", error.message);
				} else {
					console.debug("error", error);
				}
				if (retries >= maxRetries) {
					throw error;
				}

				retries += 1;
				console.debug(`Retrying in ${delay / 1000} seconds...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay *= 2; // Exponential backoff
			}
		}

		throw new Error("Max retries reached");
	}
}
