import {
	BaseTransaction,
	Client,
	isValidAddress,
	Payment,
	SubmittableTransaction,
	Transaction,
	TxResponse,
	xrpToDrops,
} from "xrpl";

import { XRPL_RPC_URL } from "../constants";
import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { Quote } from "../types";

export interface XRPLWallet {
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
		const xrplNetwork = sandbox ? XRPL_RPC_URL.Sandbox : XRPL_RPC_URL.Production;
		this.client = new Client(xrplNetwork);
	}

	/**
	 * Fetches a quote for Bitcoin transfer.
	 *
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote(symbol = "XRP"): Promise<Quote> {
		const res = await this.apiService.fetchQuote(symbol);
		return res as Quote;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol = "XRP"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	async transferXRP(params: {
		walletAddress?: string;
		amount: string;
	}): Promise<TxResponse<Transaction>> {
		console.debug("walletAddress:", params.walletAddress);
		const walletAddress = params.walletAddress ? params.walletAddress : this.wallet.address;

		if (!isValidAddress(walletAddress)) {
			throw new Error("Invalid wallet address");
		}

		const fetchVault = await this.fetchVault();
		const destination = fetchVault.address;
		console.debug("destination:", destination);

		if (!isValidAddress(destination)) {
			throw new Error("Invalid destination address");
		}

		const amountInDrops = xrpToDrops(params.amount);

		const transaction: Payment = {
			TransactionType: "Payment",
			Account: walletAddress,
			Destination: destination,
			Amount: amountInDrops,
		};

		await this.client.connect();

		try {
			const preparedTx = await this.client.autofill(transaction);
			const signedTx = await this.wallet.signTransaction(preparedTx);
			const response = await this.client.submitAndWait(signedTx);

			return response;
		} catch (error) {
			throw error;
		} finally {
			await this.client.disconnect();
		}
	}

	async transferTokens(params: {
		walletAddress?: string;
		amount: string;
		token: {
			currency: string;
			issuer: string;
			ticker: number;
		};
	}): Promise<TxResponse<Transaction>> {
		const walletAddress = params.walletAddress ? params.walletAddress : this.wallet.address;
		console.log("walletAddress:", params.walletAddress);
		if (!isValidAddress(walletAddress)) {
			throw new Error("Invalid wallet address");
		}

		// const fetchVault = await this.fetchVault("RLUSD");
		// const destination = fetchVault.address;
		const destination = "rMThEjLdpZCaXWtqRvMUjHwzg92HEH8V5";
		console.log("destination:", destination);

		if (!isValidAddress(destination)) {
			throw new Error("Invalid destination address");
		}

		const amount = BigNumber(params.amount)
			.times(BigNumber(10).pow(params.token.ticker))
			.toFixed(0);

		const transaction: Payment = {
			TransactionType: "Payment",
			Account: walletAddress,
			Destination: destination,
			Amount: {
				currency: params.token.currency,
				value: amount,
				issuer: params.token.issuer,
			},
		};

		await this.client.connect();

		try {
			const preparedTx = await this.client.autofill(transaction);
			const signedTx = await this.wallet.signTransaction(preparedTx);
			const response = await this.client.submitAndWait(signedTx);

			return response;
		} catch (error) {
			throw error;
		} finally {
			await this.client.disconnect();
		}
	}

	async getXRPBalance(walletAddress?: string) {
		const address = walletAddress ? walletAddress : this.wallet.address;
		if (!isValidAddress(address)) {
			throw new Error("Invalid wallet address");
		}

		await this.client.connect();

		try {
			const balance = await this.client.getXrpBalance(address, {
				ledger_hash: "validated",
			});
			return balance;
		} catch (error) {
			throw error;
		} finally {
			await this.client.disconnect();
		}
	}

	async getTokenBalances(walletAddress?: string) {
		const address = walletAddress ? walletAddress : this.wallet.address;
		if (!isValidAddress(address)) {
			throw new Error("Invalid wallet address");
		}

		await this.client.connect();

		try {
			const balances = await this.client.getBalances(address, {
				ledger_index: "validated",
			});

			return balances;
		} catch (error) {
			throw error;
		} finally {
			await this.client.disconnect();
		}
	}

	async getDecimalsOfCurrency(currencyHolder: string, currency: string) {
		await this.client.connect();

		try {
			const response = await this.client.getBalances(currencyHolder, {
				ledger_index: "validated",
			});

			const row = response.find((l) => l.currency === currency);
			if (!row) {
				throw new Error("Currency not found in holders account");
			}

			// just a work around. change this if found a better way to get decimals
			const splits = row.value.split(".");
			return splits.length === 2 ? splits[1].length : 0; // if it returns zero, then it is a whole number and it's a problem !!!
		} catch (error) {
			throw error;
		} finally {
			await this.client.disconnect();
		}
	}
}
