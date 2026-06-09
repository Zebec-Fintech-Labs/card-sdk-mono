import {
	type BaseTransaction,
	Client,
	isValidAddress,
	type Payment,
	type SubmittableTransaction,
	type Transaction,
	type TrustSet,
	type TxResponse,
	xrpToDrops,
} from "xrpl";

import { XRPL_RPC_URL } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";

export interface XRPLWallet {
	address: string;
	signTransaction: (transaction: SubmittableTransaction | BaseTransaction) => Promise<string>;
}

export class XRPLService {
	private apiService: ZebecCardAPIService;
	readonly client: Client;

	constructor(
		readonly wallet: XRPLWallet,
		options?: { sandbox?: boolean },
	) {
		const sandbox = options?.sandbox ? options.sandbox : false;
		this.apiService = new ZebecCardAPIService(sandbox);
		const xrplNetwork = sandbox ? XRPL_RPC_URL.Sandbox : XRPL_RPC_URL.Production;
		this.client = new Client(xrplNetwork);
	}

	/**
	 * Fetches the xrpl vault address.
	 *
	 * @returns A promise that resolves to the vault address.
	 */
	async fetchVaultByTokenAddress(address: string): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVaultByTokenAddress(address);
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

		const { address: destination, tag } = await this.fetchVaultByTokenAddress("xrp");
		console.debug("destination:", destination);
		console.debug("tag:", tag);

		if (!isValidAddress(destination)) {
			throw new Error("Invalid destination address");
		}

		const destinationTag = tag && tag !== "" ? parseInt(tag, 10) : undefined;

		const amountInDrops = xrpToDrops(params.amount);

		const transaction: Payment = {
			TransactionType: "Payment",
			Account: walletAddress,
			Destination: destination,
			Amount: amountInDrops,
			DestinationTag: destinationTag,
		};

		await this.client.connect();

		try {
			const preparedTx = await this.client.autofill(transaction);
			const signedTx = await this.wallet.signTransaction(preparedTx);
			const response = await this.client.submitAndWait(signedTx);

			return response;
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
		};
	}): Promise<TxResponse<Transaction>> {
		const walletAddress = params.walletAddress ? params.walletAddress : this.wallet.address;
		console.log("walletAddress:", params.walletAddress);
		if (!isValidAddress(walletAddress)) {
			throw new Error("Invalid wallet address");
		}

		const { address: destination, tag } = await this.fetchVaultByTokenAddress(
			params.token.currency,
		);
		console.debug("destination:", destination);
		console.debug("tag:", tag);

		if (!isValidAddress(destination)) {
			throw new Error("Invalid destination address");
		}

		const destinationTag = tag && tag !== "" ? parseInt(tag, 10) : undefined;

		const transaction: Payment = {
			TransactionType: "Payment",
			Account: walletAddress,
			Destination: destination,
			Amount: {
				currency: params.token.currency,
				value: params.amount,
				issuer: params.token.issuer,
			},
			DestinationTag: destinationTag,
		};

		await this.client.connect();

		try {
			const preparedTx = await this.client.autofill(transaction);
			const signedTx = await this.wallet.signTransaction(preparedTx);
			const response = await this.client.submitAndWait(signedTx);

			return response;
		} finally {
			await this.client.disconnect();
		}
	}

	async createTrustLine(params: {
		walletAddress?: string;
		amount: string;
		token: {
			currency: string;
			issuer: string;
		};
	}): Promise<TxResponse<Transaction>> {
		const walletAddress = params.walletAddress ? params.walletAddress : this.wallet.address;

		if (!isValidAddress(walletAddress)) {
			throw new Error("Invalid wallet address");
		}

		const transaction: TrustSet = {
			TransactionType: "TrustSet",
			Account: walletAddress,
			LimitAmount: {
				currency: params.token.currency,
				issuer: params.token.issuer,
				value: params.amount,
			},
		};

		await this.client.connect();

		try {
			const preparedTx = await this.client.autofill(transaction);
			const signedTx = await this.wallet.signTransaction(preparedTx);
			const response = await this.client.submitAndWait(signedTx);

			return response;
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
		} finally {
			await this.client.disconnect();
		}
	}
}
