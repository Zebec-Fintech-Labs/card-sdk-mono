import BigNumber from "bignumber.js";
import { ethers } from "ethers";

import {
	areDatesOfSameDay,
	bpsToPercent,
	hashSHA256,
	isEmailValid,
	percentToBps,
} from "@zebec-network/core-utils";

import {
	OdysseyZebecCard,
	OdysseyZebecCard__factory,
	Token,
	Token__factory,
	Weth,
	Weth__factory,
	ZebecCard,
	ZebecCard__factory,
} from "./artifacts";
import {
	DEFAULT_GAS_LIMIT,
	ODYSSEY_CHAIN_IDS,
	parseSupportedChain,
	USDC_ADDRESS,
	WETH_ADDRESS,
	ZEBEC_CARD_ADDRESS,
} from "./constants";

/**
 * Card type featured by zebec instant card.
 */
export type CardType = "silver" | "carbon";

/**
 * Zebec Instant Card configs
 */
export type CardConfig = {
	nativeFeePercent: string;
	nonNativeFeePercent: string;
	revenueFeePercent: string;
	totalCardSold: bigint;
	cardVault: string;
	revenueVault: string;
	commissionVault: string;
	usdcAddress: string;
	minCardAmount: string;
	maxCardAmount: string;
	dailyCardPurchaseLimit: string;
};

export type FeeTier = {
	feePercent: string;
	minAmount: string;
	maxAmount: string;
};

export type CardPurchaseOfDay = {
	totalCardPurchased: string;
	cardPurchasedTimestamp: number;
};

/**
 * A type that hold swap transaction data
 */
export type SwapData = {
	dstAmount: string;
	from: string;
	to: string;
	swapParams: {
		executor: string;
		description: {
			srcToken: string;
			dstToken: string;
			srcReceiver: string;
			dstReceiver: string;
			srcAmount: string;
			minReturnAmount: string;
			flags: string;
		};
		routeData: string;
	};
	ether: string;
	gas: number;
	gasPrice: string;
};

export type SwapAndBuyCardParams = {
	swapData: Omit<SwapData, "gas" | "gasPrice">;
	cardType: CardType;
	buyerEmail: string;
	overrides?: ethers.Overrides;
};

export type SwapAndBuyCardParamsOdyssey = {
	cardType: CardType;
	buyerEmail: string;
	ether: string;
	slippage: number;
	overrides?: ethers.Overrides;
};

/**
 * A class which holds methods and properties to interact with Zebec Instanct Card evm contracts.
 * @example
 *
 * const signer = <ethers.Signer Instance> // most wallet provider have way to create signer
 * const chainId = 11155111 // sepolia;
 * const service = new ZebecCardService(signer, chainId);
 *
 */
export class ZebecCardService {
	readonly zebecCard: ZebecCard | OdysseyZebecCard;
	readonly usdcToken: Token;
	readonly weth: Weth;

	/**
	 * Create instance of ZebecCardService.
	 * @param signer ethers signer
	 * @param chainId chain ID supported by sdk
	 */
	constructor(
		readonly signer: ethers.Signer,
		readonly chainId: number,
	) {
		const chain = parseSupportedChain(chainId);
		const zebecCardAddress = ZEBEC_CARD_ADDRESS[chain];
		const usdcAddress = USDC_ADDRESS[chain];
		const wethAddress = WETH_ADDRESS[chain];

		this.zebecCard = ODYSSEY_CHAIN_IDS.includes(chainId)
			? OdysseyZebecCard__factory.connect(zebecCardAddress, signer)
			: ZebecCard__factory.connect(zebecCardAddress, signer);

		this.usdcToken = Token__factory.connect(usdcAddress, signer);
		this.weth = Weth__factory.connect(wethAddress, signer);
	}

	/**
	 *	Sets Native Fee in card config.
	 *
	 *  Can only be invoked admin.
	 *
	 * @param params
	 * @returns
	 */
	async setNativeFee(params: {
		feeInPercent: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const feeInBps = BigInt(percentToBps(params.feeInPercent));

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};

		return this.zebecCard.setNativeFee(feeInBps, overrides);
	}

	/**
	 * Sets NonNative Fee in card config
	 *
	 * Can only be invoked admin.
	 *
	 * @param params
	 * @returns
	 */
	async setNonNativeFee(params: {
		feeInPercent: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const feeInBps = BigInt(percentToBps(params.feeInPercent));

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setNonNativeFee(feeInBps, overrides);
	}

	/**
	 * Sets Revenue Fee in card config
	 *
	 * Can only be invoked admin.
	 *
	 * @param params
	 * @returns
	 */
	async setRevenueFee(params: {
		feeInPercent: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const feeInBps = BigInt(percentToBps(params.feeInPercent));

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setRevenueFee(feeInBps, overrides);
	}

	/**
	 * Sets Revenue vault address in card config
	 *
	 * Can only be invoked admin.
	 *
	 * @param params
	 * @returns
	 */
	async setRevenueVault(params: {
		vaultAddress: ethers.AddressLike;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setRevenueVault(params.vaultAddress, overrides);
	}

	/**
	 * Sets commission vault address in card config
	 *
	 * Can only be invoked admin.
	 *
	 * @param params
	 * @returns
	 */
	async setCommissionVault(params: {
		vaultAddress: ethers.AddressLike;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT,
		};
		return this.zebecCard.setComissionVault(params.vaultAddress, overrides);
	}

	/**
	 * Sets card vault address in card config
	 *
	 * Can only be invoked admin.
	 *
	 */
	async setCardVault(params: {
		vaultAddress: ethers.AddressLike;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setCardVault(params.vaultAddress, overrides);
	}

	/**
	 * Sets usdc address in card config
	 * Can only be invoked by admin
	 */
	async setUsdcAddress(params: {
		tokenAddress: ethers.AddressLike;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setUsdcAddress(params.tokenAddress, overrides);
	}

	/**
	 * Sets minimum card amount for purchasing card in card config
	 */
	async setMinCardAmount(params: {
		minCardAmount: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const decimals = await this.usdcToken.decimals();
		const minCardAmount = ethers.parseUnits(params.minCardAmount, decimals);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setMinCardAmount(minCardAmount, overrides);
	}

	/**
	 * Sets maximum card amount for purchasing card  in card config
	 */
	async setMaxCardAmount(params: {
		maxCardAmount: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const decimals = await this.usdcToken.decimals();
		const maxCardAmount = ethers.parseUnits(params.maxCardAmount, decimals);

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setMaxCardAmount(maxCardAmount, overrides);
	}

	/**
	 * Sets daily card purchase limit in card config
	 */
	async setDailyCardPurchaseLimit(params: {
		dailyCardPurchaseLimit: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const decimals = await this.usdcToken.decimals();
		const dailyCardPurchaseLimit = ethers.parseUnits(params.dailyCardPurchaseLimit, decimals);

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setDailyCardBuyLimit(dailyCardPurchaseLimit, overrides);
	}

	/**
	 * Updates fee for given min - max (range) amount and inserts if range in not found.
	 */
	async setFee(params: {
		minAmount: string;
		maxAmount: string;
		feePercent: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const decimals = await this.usdcToken.decimals();
		const minAmount = ethers.parseUnits(params.minAmount, decimals);
		const maxAmount = ethers.parseUnits(params.maxAmount, decimals);
		const fee = percentToBps(params.feePercent);

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return (this.zebecCard as OdysseyZebecCard).setFee(minAmount, maxAmount, fee, overrides);
	}

	/**
	 * Sets fee tiers only be invoked by admin
	 */
	async setFeeTiers(params: {
		feeTiers: FeeTier[];
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const parsedFeeTiers = await this._parseFeeTiers(params.feeTiers);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setFeeArray(parsedFeeTiers, overrides);
	}

	private async _parseFeeTiers(feeTiers: FeeTier[]) {
		const decimals = await this.usdcToken.decimals();

		return feeTiers.map((feeTier) => {
			return {
				fee: percentToBps(feeTier.feePercent),
				minAmount: ethers.parseUnits(feeTier.minAmount, decimals),
				maxAmount: ethers.parseUnits(feeTier.maxAmount, decimals),
			};
		});
	}

	async setCustomFee(params: {
		tokenAddress: string;
		fee: number | string;
		overrides?: ethers.Overrides;
	}) {
		const fee = percentToBps(params.fee.toString());
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.zebecCard.setCustomTokenFee(params.tokenAddress, fee, overrides);
	}

	async getCustomFee(params: { tokenAddress: string; overrides?: ethers.Overrides }) {
		const fee = await this.zebecCard.getCustomTokenFee(params.tokenAddress);
		return bpsToPercent(fee.toString());
	}

	async setReloadableFee(params: { fee: string | number; overrides?: ethers.Overrides }) {
		const fee = percentToBps(params.fee.toString());
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return (this.zebecCard as ZebecCard).setReloadableFee(fee, overrides);
	}

	/**
	 * Deposits usdc to user vault
	 * @param params
	 * @returns
	 */
	async depositUsdc(params: {
		amount: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		if (ODYSSEY_CHAIN_IDS.includes(this.chainId)) {
			throw new Error("Method not supported for this chain");
		}

		const decimals = await this.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(params.amount, decimals);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};

		return (this.zebecCard as ZebecCard).depositUsdc(parsedAmount, overrides);
	}

	/**
	 * Withdraw usdc from user vault
	 * @param params
	 * @returns
	 */
	async withdraw(params: {
		amount: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		if (ODYSSEY_CHAIN_IDS.includes(this.chainId)) {
			throw new Error("Method not supported for this chain");
		}

		const decimals = await this.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(params.amount, decimals);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return (this.zebecCard as ZebecCard).withdraw(parsedAmount, overrides);
	}

	/**
	 * Transfer specified amount from user's vault balance to card vault with some fee amount for card purchase.
	 * @param params
	 * @returns
	 */
	async buyCard(params: {
		amount: string;
		cardType: CardType;
		buyerEmail: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		if (ODYSSEY_CHAIN_IDS.includes(this.chainId)) {
			throw new Error("Method not supported for this chain");
		}

		const decimals = await this.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(params.amount, decimals);

		if (!isEmailValid(params.buyerEmail)) {
			throw new Error("Invalid email: " + params.buyerEmail);
		}

		const vaultBalance = await this.zebecCard.cardBalances(this.signer);

		if (parsedAmount > vaultBalance) {
			throw new Error(
				"Not enough balance. Vault balance: " +
					ethers.formatUnits(vaultBalance, decimals) +
					" Requested amount: " +
					params.amount,
			);
		}

		const cardConfig = await this.zebecCard.cardConfig();
		const minRange = cardConfig.minCardAmount;
		const maxRange = cardConfig.maxCardAmount;

		if (parsedAmount < minRange || parsedAmount > maxRange) {
			throw new Error(
				"Amount must be with range: " +
					ethers.formatUnits(minRange, decimals) +
					" - " +
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
			throw new Error(
				"Requested card purchase amount exceeds daily purchase limit. Daily limit: " +
					ethers.formatUnits(cardConfig.dailyCardBuyLimit, decimals) +
					" Today's purchase amount: " +
					ethers.formatUnits(cardPurchaseInfo.totalCardBoughtPerDay, decimals),
			);
		}

		const emailHash = await hashSHA256(params.buyerEmail);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return (this.zebecCard as ZebecCard).buyCard(
			parsedAmount,
			params.cardType,
			emailHash,
			overrides,
		);
	}

	/**
	 * Swaps given src token to usdc and transfers to user's vault
	 * @param params
	 * @param overrides
	 * @returns
	 */
	async swapAndDeposit(params: {
		swapData: Omit<SwapData, "gas" | "gasPrice">;
		overrides?: ethers.Overrides;
	}) {
		if (ODYSSEY_CHAIN_IDS.includes(this.chainId)) {
			throw new Error("Method not supported for this chain");
		}

		const { swapParams, ether } = params.swapData;

		const srcToken = Token__factory.connect(swapParams.description.srcToken, this.signer);
		const dstToken = Token__factory.connect(swapParams.description.dstToken, this.signer);
		const srcTokenDecimals = await srcToken.decimals();
		const dstTokenDecimals = await dstToken.decimals();

		const executor = swapParams.executor;
		const description = {
			srcToken: swapParams.description.srcToken,
			dstToken: swapParams.description.dstToken,
			srcReceiver: swapParams.description.srcReceiver,
			dstReceiver: swapParams.description.dstReceiver,
			amount: ethers.parseUnits(swapParams.description.srcAmount, srcTokenDecimals),
			minReturnAmount: ethers.parseUnits(swapParams.description.minReturnAmount, dstTokenDecimals),
			flags: BigInt(swapParams.description.flags),
		};
		const routeData = swapParams.routeData;

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return (this.zebecCard as ZebecCard).swapAndDeposit(executor, description, routeData, {
			value: ethers.parseEther(ether),
			...overrides,
		});
	}

	async buyCardDirect(params: {
		amount: string;
		cardType: CardType;
		buyerEmail: string;
		overrides?: ethers.Overrides;
	}) {
		const decimals = await this.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(params.amount, decimals);

		if (!isEmailValid(params.buyerEmail)) {
			throw new Error("Invalid email: " + params.buyerEmail);
		}

		const cardConfig = await this.zebecCard.cardConfig();
		const minRange = cardConfig.minCardAmount;
		const maxRange = cardConfig.maxCardAmount;

		if (parsedAmount < minRange || parsedAmount > maxRange) {
			throw new Error(
				"Amount must be with range: " +
					ethers.formatUnits(minRange, decimals) +
					" - " +
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
			throw new Error(
				"Requested card purchase amount exceeds daily purchase limit. Daily limit: " +
					ethers.formatUnits(cardConfig.dailyCardBuyLimit, decimals) +
					" Today's purchase amount: " +
					ethers.formatUnits(cardPurchaseInfo.totalCardBoughtPerDay, decimals),
			);
		}

		const emailHash = await hashSHA256(params.buyerEmail);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};

		if (ODYSSEY_CHAIN_IDS.includes(this.chainId)) {
			return (this.zebecCard as OdysseyZebecCard).buyCardDirect(
				parsedAmount,
				params.cardType === "carbon" ? "reloadable" : "non_reloadable",
				emailHash,
				overrides,
			);
		} else {
			return (this.zebecCard as ZebecCard).buyCardDirect(
				parsedAmount,
				params.cardType === "carbon" ? "reloadable" : "non_reloadable",
				emailHash,
				overrides,
			);
		}
	}

	async swapAndBuyCardDirect(params: SwapAndBuyCardParams) {
		if (ODYSSEY_CHAIN_IDS.includes(this.chainId)) {
			throw new Error("Method not supported for this chain");
		}

		const {
			buyerEmail,
			cardType,
			swapData: { swapParams, ether },
		} = params;

		const srcToken = Token__factory.connect(swapParams.description.srcToken, this.signer);
		const dstToken = Token__factory.connect(swapParams.description.dstToken, this.signer);
		const srcTokenDecimals = await srcToken.decimals();
		const dstTokenDecimals = await dstToken.decimals();

		const executor = swapParams.executor;

		const amount = ethers.parseUnits(swapParams.description.srcAmount, srcTokenDecimals);
		const minReturnAmount = ethers.parseUnits(
			swapParams.description.minReturnAmount,
			dstTokenDecimals,
		);
		const description = {
			srcToken: swapParams.description.srcToken,
			dstToken: swapParams.description.dstToken,
			srcReceiver: swapParams.description.srcReceiver,
			dstReceiver: swapParams.description.dstReceiver,
			amount,
			minReturnAmount,
			flags: BigInt(swapParams.description.flags),
		};

		const routeData = swapParams.routeData;

		const cardConfig = await this.zebecCard.cardConfig();
		const minRange = cardConfig.minCardAmount;
		const maxRange = cardConfig.maxCardAmount;

		const fee = await this.zebecCard.getCustomTokenFee(swapParams.description.srcToken);

		const feeAmount = BigNumber(minReturnAmount.toString()).times(
			BigNumber(fee.toString()).div(10000),
		);

		const amountAfterFeeDeduction = BigInt(
			BigNumber(minReturnAmount.toString()).minus(feeAmount).toFixed(0, BigNumber.ROUND_DOWN),
		);

		if (amountAfterFeeDeduction < minRange || amountAfterFeeDeduction > maxRange) {
			throw new Error(
				"Amount must be with range: " +
					ethers.formatUnits(minRange, dstTokenDecimals) +
					" - " +
					ethers.formatUnits(maxRange, dstTokenDecimals),
			);
		}

		const cardPurchaseInfo = await this.zebecCard.cardPurchases(this.signer);
		const lastCardPurchaseDate = new Date(Number(cardPurchaseInfo.unixInRecord * 1000n));
		const today = new Date();

		let cardPurchaseOfDay = 0n;
		if (areDatesOfSameDay(today, lastCardPurchaseDate)) {
			cardPurchaseOfDay = cardPurchaseInfo.totalCardBoughtPerDay + amountAfterFeeDeduction;
		} else {
			cardPurchaseOfDay = amountAfterFeeDeduction;
		}

		if (cardPurchaseOfDay > cardConfig.dailyCardBuyLimit) {
			throw new Error(
				"Requested card purchase amount exceeds daily purchase limit. Daily limit: " +
					ethers.formatUnits(cardConfig.dailyCardBuyLimit, dstTokenDecimals) +
					" Today's purchase amount will be: " +
					ethers.formatUnits(cardPurchaseOfDay, dstTokenDecimals),
			);
		}

		const emailHash = await hashSHA256(buyerEmail);

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return (this.zebecCard as ZebecCard).swapAndBuy(
			executor,
			description,
			routeData,
			cardType === "carbon" ? "reloadable" : "non_reloadable",
			emailHash,
			{
				value: ethers.parseEther(ether),
				...overrides,
			},
		);
	}

	async swapAndBuyCardOdyssey(params: SwapAndBuyCardParamsOdyssey) {
		const swapEtherAmount = ethers.parseEther(params.ether);
		const minAmount = await (this.zebecCard as OdysseyZebecCard).getMinimumUSDCAmount(
			swapEtherAmount,
			params.slippage,
		);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return (this.zebecCard as OdysseyZebecCard).swapAndBuy(
			params.cardType === "carbon" ? "reloadable" : "non_reloadable",
			params.buyerEmail,
			minAmount,
			{
				value: swapEtherAmount,
				...overrides,
			},
		);
	}

	async getReloadableFee() {
		const fee = await (this.zebecCard as ZebecCard).getReloadableFee();

		return bpsToPercent(fee.toString());
	}

	/**
	 * Deposit usdc from user's vault to yield provider
	 * @param params
	 * @returns
	 */
	async generateYield(params: {
		amount: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		if (ODYSSEY_CHAIN_IDS.includes(this.chainId)) {
			throw new Error("Method not supported for this chain");
		}

		const decimals = await this.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(params.amount, decimals);

		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};

		return (this.zebecCard as ZebecCard).generateYield(parsedAmount, overrides);
	}

	/**
	 * Gets minimum usdc amount for given ether amount
	 * @param etherAmount
	 * @param slippage
	 * @returns
	 */
	async getMinimumUsdcAmount(etherAmount: string, slippage: number) {
		const parsedEtherAmount = ethers.parseEther(etherAmount);
		const minAmount = await (this.zebecCard as OdysseyZebecCard).getMinimumUSDCAmount(
			parsedEtherAmount,
			slippage,
		);
		return ethers.formatUnits(minAmount, BigInt(6));
	}

	/**
	 *  Withdaw deposits and yield from yield provider
	 * @param params
	 * @returns
	 */
	async withdrawYield(params: {
		amount: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		if (ODYSSEY_CHAIN_IDS.includes(this.chainId)) {
			throw new Error("Method not supported for this chain");
		}

		const decimals = await this.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(params.amount, decimals);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};

		return (this.zebecCard as ZebecCard).withdrawYield(parsedAmount, overrides);
	}

	/**
	 * Gets user's vault balance
	 * @param params
	 * @returns
	 */
	async getUserBalance(params: { userAddress: ethers.AddressLike }): Promise<string> {
		const decimals = await this.usdcToken.decimals();
		const cardBalance = await this.zebecCard.cardBalances(params.userAddress);
		const formattedBalance = ethers.formatUnits(cardBalance, decimals);
		return formattedBalance;
	}

	/**
	 * Gets user's card purchase
	 * @param params
	 * @returns
	 */
	async getCardPurhcaseOfDay(params: {
		userAddress: ethers.AddressLike;
	}): Promise<CardPurchaseOfDay> {
		const decimals = await this.usdcToken.decimals();
		const cardPurchase = await this.zebecCard.cardPurchases(params.userAddress);
		const totalCardPurchased = ethers.formatUnits(cardPurchase.totalCardBoughtPerDay, decimals);
		const cardPurchasedTimestamp = Number(cardPurchase.unixInRecord.toString());

		return {
			totalCardPurchased,
			cardPurchasedTimestamp,
		};
	}

	/**
	 * Gets Zebec Instant Card contract configs
	 * @returns
	 */
	async getCardConfig(): Promise<CardConfig> {
		const cardConfig = await this.zebecCard.cardConfig();
		const nativeFeePercent = bpsToPercent(cardConfig.nativeFee.toString());
		const nonNativeFeePercent = bpsToPercent(cardConfig.nonNativeFee.toString());
		const revenueFeePercent = bpsToPercent(cardConfig.revenueFee.toString());

		const decimals = await this.usdcToken.decimals();
		const minCardAmount = ethers.formatUnits(cardConfig.minCardAmount, decimals);
		const maxCardAmount = ethers.formatUnits(cardConfig.maxCardAmount, decimals);
		const dailyCardPurchaseLimit = ethers.formatUnits(cardConfig.dailyCardBuyLimit, decimals);

		return {
			cardVault: cardConfig.cardVault,
			commissionVault: cardConfig.commissionVault,
			revenueVault: cardConfig.revenueVault,
			nativeFeePercent,
			nonNativeFeePercent,
			revenueFeePercent,
			totalCardSold: cardConfig.counter,
			usdcAddress: cardConfig.usdcAddress,
			maxCardAmount,
			minCardAmount,
			dailyCardPurchaseLimit,
		};
	}

	/**
	 * Gets fee tiers
	 * @returns Array of fee tier
	 */
	async getFeeTiers(): Promise<Array<FeeTier>> {
		const decimals = await this.usdcToken.decimals();
		const feeTiers = await this.zebecCard.getFeeTiers();

		return feeTiers.map<FeeTier>((feeTier) => {
			return {
				feePercent: bpsToPercent(feeTier.fee.toString()),
				maxAmount: ethers.formatUnits(feeTier.maxAmount, decimals),
				minAmount: ethers.formatUnits(feeTier.minAmount, decimals),
			};
		});
	}

	/**
	 * Gets admin adddress
	 * @returns
	 */
	async getAdmin(): Promise<string> {
		return this.zebecCard.owner();
	}

	/**
	 * add allowance of given amount of given token to given spender
	 * @param params
	 * @returns
	 */
	async approve(params: {
		token: string;
		spender: ethers.AddressLike;
		amount: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse | null> {
		const token = Token__factory.connect(params.token, this.signer);
		const decimals = await token.decimals();
		const parsedAmount = ethers.parseUnits(params.amount, decimals);
		const allowance = await token.allowance(this.signer, params.spender);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		if (allowance < parsedAmount) {
			return await token.approve(params.spender, parsedAmount, overrides);
		}

		return null;
	}

	/**
	 * Wrap ETH to Wrapped ETH
	 * @param param
	 * @returns
	 */
	async wrapEth(params: {
		amount: string;
		overrides?: ethers.Overrides;
	}): Promise<ethers.ContractTransactionResponse> {
		const parsedAmount = ethers.parseEther(params.amount);
		const overrides = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit || DEFAULT_GAS_LIMIT, // Default
		};
		return this.weth.deposit({ value: parsedAmount, ...overrides });
	}
}
