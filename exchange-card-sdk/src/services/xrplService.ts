import {
	BaseTransaction,
	Client,
	Payment,
	SubmittableTransaction,
	Transaction,
	TxResponse,
	xrpToDrops,
} from "xrpl";

import { XRPL_RPC_URL } from "../constants";
import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { Quote } from "../types";

interface XRPLWallet {
	address: string;
	signTransaction: (transaction: SubmittableTransaction | BaseTransaction) => Promise<string>;
}

export class XRPLService {
	private apiService: ZebecCardAPIService;
	private client: Client;

	constructor(
		readonly wallet: XRPLWallet,
		apiConfig: APIConfig,
		options?: { sandbox?: boolean },
	) {
		const sandbox = options?.sandbox ? options.sandbox : false;
		this.apiService = new ZebecCardAPIService(apiConfig, sandbox);
		const xrplNetwork = sandbox ? XRPL_RPC_URL.Production : XRPL_RPC_URL.Sandbox;
		this.client = new Client(xrplNetwork);
	}

	/**
	 * Fetches a quote for Bitcoin transfer.
	 *
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote(): Promise<Quote> {
		const res = await this.apiService.fetchQuote("XRP");
		return res as Quote;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault("XRP");
		return data;
	}

	async transferXRP(params: {
		walletAddress: string;
		amount: string;
	}): Promise<TxResponse<Transaction>> {
		const { walletAddress, amount } = params;

		const transaction: Payment = {
			TransactionType: "Payment",
			Account: this.wallet.address,
			Destination: walletAddress,
			Amount: xrpToDrops(amount),
		};

		await this.client.connect();

		try {
			const preparedTx = await this.client.autofill(transaction);
			const signedTx = await this.wallet.signTransaction(preparedTx);
			const response = await this.client.submitAndWait(signedTx);

			return response;
		} catch (error) {
			console.error("Error from XRPL Client:", error);
			throw error;
		} finally {
			await this.client.disconnect();
		}
	}

	async transferTokens(params: {
		walletAddress: string;
		amount: string;
		token: {
			currency: string;
			issuer: string;
		};
	}): Promise<TxResponse<Transaction>> {
		const { walletAddress, amount, token } = params;

		const transaction: Payment = {
			TransactionType: "Payment",
			Account: this.wallet.address,
			Destination: walletAddress,
			Amount: {
				currency: token.currency,
				value: amount,
				issuer: token.issuer,
			},
		};

		await this.client.connect();

		try {
			const preparedTx = await this.client.autofill(transaction);
			const signedTx = await this.wallet.signTransaction(preparedTx);
			const response = await this.client.submitAndWait(signedTx);

			return response;
		} catch (error) {
			console.error("Error from XRPL Client:", error);
			throw error;
		} finally {
			await this.client.disconnect();
		}
	}
}
