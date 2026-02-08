import { AleoNetworkClient } from "@provablehq/sdk/mainnet.js";
import { AleoNetworkClient as TestnetAleoNetworkProvider } from "@provablehq/sdk/testnet.js";

import { ALEO_NETWORK_CLIENT_URLS } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";
import {
	creditsToMicrocredits,
	microcreditsToCredits,
} from "../utils";

export interface AleoTransition {
	program: string;
	functionName: string;
	inputs: any[];
}

export interface AleoTransaction {
	address: string;
	chainId: string;
	transitions: AleoTransition[];
	fee: number;
	feePrivate: boolean;
}

export interface AleoWallet {
	address: string;
	// requestRecords: (programId: string) => Promise<any[]>;
	requestTransaction: (transaction: AleoTransaction) => Promise<{ transactionId: string }>;
}

export type AleoTransferCreditParams = {
	amount: number | string;
	chainId: string;
	fee?: number;
	feePrivate?: boolean;
};

export type AleoTransferTokenParams = {
	tokenProgramId: string;
	tokenDecimals: number;
	tokenSymbol: string;
	chainId: string;
	amount: number | string;
	fee?: number;
	feePrivate?: boolean;
};

export class AleoService {
	readonly wallet: AleoWallet;
	readonly sandbox: boolean;
	readonly apiService: ZebecCardAPIService;
	readonly client: AleoNetworkClient | TestnetAleoNetworkProvider;

	constructor(
		wallet: AleoWallet,
		options?: {
			sandbox?: boolean;
		},
	) {
		this.wallet = wallet;
		this.sandbox = options?.sandbox || false;
		this.apiService = new ZebecCardAPIService(options?.sandbox || false);
		this.client = options?.sandbox ?
			new TestnetAleoNetworkProvider(ALEO_NETWORK_CLIENT_URLS.Sandbox) :
			new AleoNetworkClient(ALEO_NETWORK_CLIENT_URLS.Production)
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol = "ALEO"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	/**
	 * Transfer native Aleo credits to the specified recipient.
	 *
	 * @param recipient - The recipient's Aleo address.
	 */
	async transferCredits(params: AleoTransferCreditParams): Promise<{ transactionId: string }> {
		const { amount, chainId } = params;

		const fee = params?.fee || 100000; // Default fee, can be adjusted as needed
		const feePrivate = params?.feePrivate || false;

		const programId = "credits.aleo";
		const functionName = "transfer_public";

		const vault = await this.fetchVault("ALEO");
		const recipient = vault.address;

		const amountInMiroCredits = creditsToMicrocredits(amount);

		const transition: AleoTransition = {
			program: programId,
			functionName,
			inputs: [recipient, `${amountInMiroCredits}u64`],
		};

		const transaction: AleoTransaction = {
			address: this.wallet.address,
			chainId,
			transitions: [transition],
			fee,
			feePrivate,
		};

		const result = await this.wallet.requestTransaction(transaction);

		return result;
	}

	async transferTokens(tokens: AleoTransferTokenParams): Promise<{ transactionId: string }> {
		const { tokenProgramId, tokenDecimals, tokenSymbol, amount, chainId } = tokens;

		const fee = tokens?.fee || 100000; // Default fee, can be adjusted as needed
		const feePrivate = tokens?.feePrivate || false;

		const vault = await this.fetchVault(tokenSymbol);
		const recipient = vault.address;

		const amountInMicroTokens = creditsToMicrocredits(amount, tokenDecimals);

		const programId = "token_registry.aleo";
		const functionName = "transfer_public";

		const transition: AleoTransition = {
			program: programId,
			functionName,
			inputs: [tokenProgramId, recipient, `${amountInMicroTokens}u128`],
		};

		const transaction: AleoTransaction = {
			address: this.wallet.address,
			chainId,
			transitions: [transition],
			fee,
			feePrivate,
		};

		const result = await this.wallet.requestTransaction(transaction);

		return result;
	}

	async getBalance(address: string): Promise<string> {

		const programId = "credits.aleo";
		const mappingName = "account";
		const balance = await this.client.getProgramMappingValue(programId, mappingName, address);
		// regex to extract the number part and convert it to a string with 6 decimal places
		const regex = /(\d+)u64/;
		const match = balance.match(regex);

		if (match) {
			const amount = match[1];
			const formattedAmount = microcreditsToCredits(amount);
			return formattedAmount;
		} else {
			throw new Error("Invalid balance format");
		}
	}

	async getTokenBalance(_address: string, _tokenProgramId: string, _tokenDecimals: number): Promise<string> {
		throw new Error("Not implemented yet");
	}
}
