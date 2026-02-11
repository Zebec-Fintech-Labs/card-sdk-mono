import { AleoNetworkClient } from "@provablehq/sdk/mainnet.js";
import { AleoNetworkClient as TestnetAleoNetworkClient } from "@provablehq/sdk/testnet.js";

import { ALEO_NETWORK_CLIENT_URL } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";
import { creditsToMicrocredits, getTokenBySymbol, microcreditsToCredits } from "../utils";

export interface AleoTransition {
	program: string;
	functionName: string;
	// biome-ignore lint/suspicious/noExplicitAny: we don't know what we'll be inputs item type
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
	transferType?: "public" | "private" | "privateToPublic" | "publicToPrivate";
	fee?: number;
	feePrivate?: boolean;
};

export type AleoTransferTokenParams = {
	tokenProgramId: string;
	tokenSymbol: string;
	amount: number | string;
	transferType?: "public" | "private" | "privateToPublic" | "publicToPrivate";
	fee?: number;
	feePrivate?: boolean;
};

export class AleoService {
	readonly wallet: AleoWallet;
	readonly sandbox: boolean;
	readonly apiService: ZebecCardAPIService;
	readonly networkClient: AleoNetworkClient | TestnetAleoNetworkClient;

	constructor(
		wallet: AleoWallet,
		options?: {
			sandbox?: boolean;
		},
	) {
		this.wallet = wallet;
		this.sandbox = options?.sandbox || false;
		this.apiService = new ZebecCardAPIService(options?.sandbox || false);
		this.networkClient = this.sandbox
			? new TestnetAleoNetworkClient(ALEO_NETWORK_CLIENT_URL)
			: new AleoNetworkClient(ALEO_NETWORK_CLIENT_URL);
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
	 */
	async transferCredits(params: AleoTransferCreditParams): Promise<{ transactionId: string }> {
		const { amount } = params;

		const transferType = params.transferType || "public";
		const feePrivate = params?.feePrivate || false;

		const vault = await this.fetchVault("ALEO");
		const recipient = vault.address;
		console.log("recipient:", recipient);

		const amountInMiroCredits = creditsToMicrocredits(amount);

		const programName = "credits.aleo";
		const functionName =
			transferType === "public"
				? "transfer_public"
				: transferType === "private"
					? "transfer_private"
					: transferType === "privateToPublic"
						? "transfer_private_to_public"
						: "transfer_public_to_private";

		const result = await this.wallet.requestTransaction({
			address: this.wallet.address,
			chainId: this.sandbox ? "testnet" : "mainnet",
			fee: Number(creditsToMicrocredits(params.fee || 0.035)),
			feePrivate,
			transitions: [
				{
					functionName,
					program: programName,
					inputs: [recipient, `${amountInMiroCredits}u64`],
				},
			],
		});

		return result;
	}

	async transferTokens(params: AleoTransferTokenParams): Promise<{ transactionId: string }> {
		const { tokenSymbol, amount } = params;

		const tokenMetadata = await getTokenBySymbol(tokenSymbol, this.sandbox ? "testnet" : "mainnet");
		if (!("decimals" in tokenMetadata)) {
			throw new Error(`Token metadata for ${tokenSymbol} does not include decimals.`);
		}
		const tokenDecimals = tokenMetadata.decimals;
		if (!("token_id" in tokenMetadata)) {
			throw new Error(`Token metadata for ${tokenSymbol} does not include token_id.`);
		}
		const tokenId = tokenMetadata.token_id;
		if (!("token_id_datatype" in tokenMetadata)) {
			throw new Error(`Token metadata for ${tokenSymbol} does not include token_id_datatype.`);
		}
		const tokenIdDatatype = tokenMetadata.token_id_datatype;

		const transferType = params.transferType || "public";
		const feePrivate = params?.feePrivate || false;

		const vault = await this.fetchVault(tokenSymbol);
		const recipient = vault.address;

		const amountInMicroTokens = creditsToMicrocredits(amount, tokenDecimals);

		const programName = "token_registry.aleo";
		const functionName =
			transferType === "public"
				? "transfer_public"
				: transferType === "private"
					? "transfer_private"
					: transferType === "privateToPublic"
						? "transfer_private_to_public"
						: "transfer_public_to_private";

		const result = await this.wallet.requestTransaction({
			address: this.wallet.address,
			chainId: this.sandbox ? "testnet" : "mainnet",
			fee: Number(creditsToMicrocredits(params.fee || 0.035)),
			feePrivate,
			transitions: [
				{
					functionName,
					program: programName,
					inputs: [`${tokenId}${tokenIdDatatype}`, recipient, `${amountInMicroTokens}u128`],
				},
			],
		});

		return result;
	}

	async getBalance(walletAddress: string): Promise<string> {
		const programId = "credits.aleo";
		const mappingName = "account";
		const balance = await this.networkClient.getProgramMappingValue(
			programId,
			mappingName,
			walletAddress,
		);

		if (balance) {
			// regex to extract the number part and convert it to a string with 6 decimal places
			const regex = /(\d+)u64/;
			const match = balance.match(regex);

			if (match) {
				const amount = match[1];
				const formattedAmount = microcreditsToCredits(amount);
				return formattedAmount;
			} else {
				throw new Error(`Invalid balance format: ${balance}`);
			}
		} else {
			return "0";
		}
	}

	async getTokenBalance(
		walletAddress: string,
		tokenProgramId: string,
		tokenSymbol: string,
	): Promise<string> {
		const tokenMetadata = await getTokenBySymbol(tokenSymbol, this.sandbox ? "testnet" : "mainnet");
		if (!("decimals" in tokenMetadata)) {
			throw new Error(`Token metadata for ${tokenSymbol} does not include decimals.`);
		}

		const mappingNames = await this.networkClient.getProgramMappingNames(tokenProgramId);

		const balanceMappingName = mappingNames.includes("balances")
			? "balances"
			: mappingNames.includes("account")
				? "account"
				: null;

		if (!balanceMappingName) {
			throw new Error("No public balance mapping found (no 'balances' or 'account').");
		}

		const balance = await this.networkClient.getProgramMappingValue(
			tokenProgramId,
			balanceMappingName,
			walletAddress,
		);

		if (balance) {
			const regex = /(\d+)u128/;
			const match = balance.match(regex);

			if (match) {
				const amount = match[1];
				const formattedAmount = microcreditsToCredits(amount, tokenMetadata.decimals);
				return formattedAmount;
			} else {
				throw new Error(`Invalid balance format: ${balance}`);
			}
		} else {
			return "0";
		}
	}
}
