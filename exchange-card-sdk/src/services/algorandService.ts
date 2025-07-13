import algosdk from "algosdk";
import { BigNumber } from "bignumber.js";

import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { ClientManager } from "@algorandfoundation/algokit-utils/types/client-manager";

import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { Quote } from "../types";

// Configuration interface
export interface TransferConfig {
	amount: number | string; // Amount in Algos
	note?: string;
}

export interface AlgorandWallet {
	address: algosdk.Address;
	signTransaction: (txn: algosdk.Transaction) => Promise<Uint8Array<ArrayBufferLike>>;
}

export class AlgorandService {
	readonly algodClient: algosdk.Algodv2;
	readonly algorandClient: AlgorandClient;
	private apiService: ZebecCardAPIService;

	constructor(
		readonly wallet: AlgorandWallet,
		readonly apiConfig: APIConfig,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		const network = sdkOptions?.sandbox ? "testnet" : "mainnet";
		this.algodClient = ClientManager.getAlgodClient(
			ClientManager.getAlgoNodeConfig(network, "algod"),
		);
		this.algorandClient = AlgorandClient.fromClients({
			algod: this.algodClient,
		});
		this.apiService = new ZebecCardAPIService(apiConfig, sdkOptions?.sandbox || false);
	}

	/**
	 * Fetches a quote for Bitcoin transfer.
	 *
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote(symbol = "ALGO"): Promise<Quote> {
		const res = await this.apiService.fetchQuote(symbol);
		return res as Quote;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol = "ALGO"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	/**
	 * Transfer Algorand currency from one wallet to another
	 * @param config Transfer configuration
	 * @returns Transaction ID if successful
	 */
	async transferAlgo(config: TransferConfig): Promise<string> {
		try {
			const parsedAmount = algoToMicroAlgo(config.amount);

			// Check if sender has sufficient balance
			const senderBalance = await this.getAccountBalanceInMicroAlgo(this.wallet.address);
			const minBalance = algoToMicroAlgo(0.1); // Minimum account balance

			if (senderBalance < parsedAmount + minBalance) {
				throw new Error(
					`Insufficient balance. Need ${microAlgoToAlgo(parsedAmount + minBalance)} ALGO, have ${microAlgoToAlgo(senderBalance)} ALGO`,
				);
			}

			const vault = await this.fetchVault("ALGO");
			const recipientAddress = vault.address;

			// Validate recipient address
			if (!algosdk.isValidAddress(recipientAddress)) {
				throw new Error("Invalid recipient address");
			}

			// Get suggested transaction parameters
			const suggestedParams = await this.algodClient.getTransactionParams().do();

			// Create payment transaction
			const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
				sender: this.wallet.address,
				receiver: recipientAddress,
				amount: parsedAmount,
				note: config.note ? new Uint8Array(Buffer.from(config.note)) : undefined,
				suggestedParams: suggestedParams,
				closeRemainderTo: this.wallet.address,
			});

			// Sign the transaction
			const signedTxn = await this.wallet.signTransaction(paymentTxn);

			// Submit the transaction
			const txResponse = await this.algodClient.sendRawTransaction(signedTxn).do();

			// Wait for confirmation
			const WAIT_ROUNDS = 4;
			const confirmedTxn = await algosdk.waitForConfirmation(
				this.algodClient,
				txResponse.txid,
				WAIT_ROUNDS, // Wait for 4 rounds
			);

			console.log("Transaction confirmed in round:", confirmedTxn.confirmedRound);
			console.log("Transaction ID:", txResponse.txid);

			return txResponse.txid;
		} catch (error) {
			console.error("Transfer failed:", error);
			throw error;
		}
	}

	/**
	 * Get account balance in Algos
	 * @param address Account address
	 * @returns Balance in ALGO
	 */
	async getAccountBalance(address: string | algosdk.Address): Promise<number> {
		const amount = await this.getAccountBalanceInMicroAlgo(address);
		return microAlgoToAlgo(amount);
	}

	/**
	 * Get account balance in microAlgos (for internal calculations)
	 * @param address Account address
	 * @returns Balance in microAlgos
	 */
	private async getAccountBalanceInMicroAlgo(address: string | algosdk.Address): Promise<bigint> {
		const accountInfo = await this.algodClient.accountInformation(address).do();
		return accountInfo.amount;
	}
}

/**
 * Convert ALGO to microAlgos
 * @param algos Amount in ALGO
 * @returns Amount in microAlgos
 */
export function algoToMicroAlgo(algos: number | string): bigint {
	return BigInt(BigNumber(algos).times(1_000_000).toFixed(0));
}

/**
 * Convert microAlgos to ALGO
 * @param microAlgos Amount in microAlgos
 * @returns Amount in ALGO
 */
export function microAlgoToAlgo(microAlgos: number | bigint): number {
	return BigNumber(microAlgos).div(1_000_000).toNumber();
}
