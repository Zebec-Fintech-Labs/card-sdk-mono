import { PLATFORM_FEE, TON_RPC_URL } from "../constants";
import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { ITonConnect } from "@tonconnect/sdk";
import TonWeb from "tonweb";
import { Quote } from "../types";

async function formatPayload(message: string) {
	const cell = new TonWeb.boc.Cell();
	cell.bits.writeUint(0, 32);
	cell.bits.writeString(message);
	const boc = await cell.toBoc();
	return Buffer.from(boc).toString("base64");
}

async function bocToHash(boc: string) {
	const cell = TonWeb.boc.Cell.fromBoc(Buffer.from(boc, "base64").toString("hex"));
	return Buffer.from(await cell[0].hash()).toString("hex");
}

export class ZebecCardTONService {
	private apiService: ZebecCardAPIService;
	private tonRPC: string;
	private tonweb: TonWeb;
	private sandbox: boolean;
	/**
	 * Constructs an instance of the service.
	 *
	 * @param {Signer} signer - The signer which can be either a PolkadotJs Signer or a KeyringPair.
	 * @param {APIConfig} apiConfig - The configuration object for the API.
	 * @param sdkOptions - Optional configuration for the SDK.
	 */
	constructor(
		readonly signer: ITonConnect,
		apiConfig: APIConfig,
		sdkOptions?: {
			sandbox?: boolean;
			apiKey?: string;
		},
	) {
		const sandbox = sdkOptions?.sandbox ? sdkOptions.sandbox : false;
		this.apiService = new ZebecCardAPIService(apiConfig, sandbox);
		this.tonRPC = sandbox ? TON_RPC_URL.Sandbox : TON_RPC_URL.Production;
		this.tonweb = new TonWeb(
			new TonWeb.HttpProvider(this.tonRPC, {
				apiKey:
					sdkOptions?.apiKey ?? "2191825d6718d115f3caffa8f69de292dd55de3b8c62a61421e7887148a60d6c",
			}),
		);
		this.sandbox = sandbox;
	}

	/**
	 * Fetches a quote for the given amount.
	 *
	 * @param {string | number} amount - The amount for which to fetch the quote.
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote() {
		const res = await this.apiService.fetchQuote("TON");
		return res as Quote;
	}

	/**
	 * Fetches the TAO Vault address.
	 *
	 * @returns {Promise<string>} A promise that resolves to the TAO Vault address.
	 */
	async fetchVault() {
		const data = await this.apiService.fetchVault("TON");
		return data;
	}

	/**
	 * Purchases a card by transferring TAO tokens.
	 *
	 * @param params - The parameters required to purchase a card.
	 * @param params.walletAddress - The wallet address from which TAO tokens will be transferred.
	 * @param params.amount - The amount of TAO tokens to transfer.
	 * @returns A promise that resolves to transaction hash.
	 * @throws {Error} If there is not enough balance or if the transaction fails.
	 */
	async transferTon(params: { walletAddress: string; amount: number }): Promise<string> {
		if (
			!this.signer.account?.walletStateInit ||
			!this.signer.account?.publicKey ||
			!this.signer.account?.address
		) {
			throw new Error("Invalid wallet account");
		}
		// Fetch deposit address
		const { address: depositAddress, tag } = await this.fetchVault();
		const walletAddress = new TonWeb.utils.Address(this.signer.account.address).toString(
			true,
			true,
			false,
			this.sandbox,
		);

		// Calculate fees and total amount
		const platform_fee = (params.amount * PLATFORM_FEE) / 10000;
		const totalAmount = Math.floor((params.amount + platform_fee) * 10 ** 9);

		// Check Wallet balance
		const balance = await this.tonweb.getBalance(walletAddress);
		if (Number(balance) < totalAmount) {
			throw new Error("Insufficient balance");
		}

		// Prepare transaction
		const transaction = {
			validUntil: Math.floor(Date.now() / 1000) + 60, // 60 sec
			messages: [
				{
					address: depositAddress,
					amount: totalAmount.toString(),
					payload: await formatPayload(tag || ""),
				},
			],
		};

		// Sign and submit transaction
		const result = await this.signer.sendTransaction(transaction);
		const txHash = await bocToHash(result.boc);

		let retries = 0;
		const maxRetries = 5;
		let delay = 1000;

		while (retries < maxRetries) {
			try {
				return txHash;
			} catch (error) {
				console.debug("error: ", error);

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

	/**
	 * Retrieves the balance of the specified wallet.
	 *
	 * @param {string} wallet - The address of the wallet to get the balance for. If the address starts with "0:", it will be converted to a full address format.
	 * @returns {Promise<string>} - A promise that resolves to the balance of the wallet.
	 */
	async getWalletBalance(wallet: string) {
		let walletAddress = wallet;
		if (wallet.startsWith("0:")) {
			walletAddress = new TonWeb.utils.Address(wallet).toString(true, true, false, this.sandbox);
		}
		return this.tonweb.utils.fromNano(await this.tonweb.getBalance(walletAddress));
	}
}
