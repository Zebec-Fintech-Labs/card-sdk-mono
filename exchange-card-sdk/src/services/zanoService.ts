import { BigNumber } from "bignumber.js";
import { ServerWallet } from "zano_web3/server";

import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { Quote } from "../types";

export interface APIAsset {
	asset_id: string;
	current_supply: number;
	decimal_point: number;
	full_name: string;
	hidden_supply: boolean;
	meta_info: string;
	owner: string;
	ticker: string;
	total_max_supply: number;
}

export interface BalanceInfo {
	name: string;
	ticker: string;
	id: string;
	amount: string;
	awaiting_in: string;
	awaiting_out: string;
	total: string;
	unlocked: string;
	asset_info: APIAsset;
}

export interface ZanoServiceConfig {
	walletUrl: string;
	daemonUrl: string;
}

export interface ZanoTransferParams {
	assetId: string;
	amount: string; // Amount in asset units (e.g., "10.5" for 10.5 ZANO)
	comment?: string;
}

export interface ZanoTransferResult {
	success: boolean;
	transactionHash?: string;
	error?: string;
	result?: any;
}

export class ZanoService {
	private readonly serverWallet: ServerWallet;

	private readonly apiService: ZebecCardAPIService;
	// private readonly network: "mainnet" | "testnet";

	constructor(
		config: ZanoServiceConfig,
		readonly apiConfig: APIConfig,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		// this.network = sdkOptions?.sandbox ? "testnet" : "mainnet";
		this.apiService = new ZebecCardAPIService(apiConfig, sdkOptions?.sandbox || false);

		this.serverWallet = new ServerWallet({
			walletUrl: config.walletUrl,
			daemonUrl: config.daemonUrl,
		});
	}

	/**
	 * Fetches a quote for Bitcoin transfer.
	 *
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote(symbol = "ZANO"): Promise<Quote> {
		const res = await this.apiService.fetchQuote(symbol);
		return res as Quote;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol = "ZANO"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	/**
	 * Send a transfer
	 */
	async transferAssets(params: ZanoTransferParams): Promise<ZanoTransferResult> {
		// Get asset info to validate amount format
		try {
			const assetInfo = await this.getAssetDetails(params.assetId);
			const decimalPoints = assetInfo.decimal_point; // Default to 12 for ZANO

			if (!this.validateAmount(params.amount, decimalPoints)) {
				throw new Error(`Invalid amount format for asset with ${decimalPoints} decimal points`);
			}
		} catch (assetError) {
			console.warn("Could not validate asset decimal points, proceeding with transfer");
		}

		// Check if we have sufficient balance
		const assetBalance = await this.getAssetBalance(params.assetId);
		if (assetBalance) {
			const availableBalance = BigNumber(assetBalance.unlocked);
			const transferAmount = BigNumber(params.amount);

			if (transferAmount.isGreaterThan(availableBalance)) {
				throw new Error(
					`Insufficient balance. Available: ${assetBalance.unlocked} ${assetBalance.ticker || "tokens"}`,
				);
			}
		}

		// const vault = await this.fetchVault("ZANO");
		// const receiver = vault.address;
		// hard coded receiver for testing;
		const receiver =
			"ZxCVeKWFiuZEedS4E1qAyZiwj9mys1BKMjfd2dLiDReg3UKUAciiqA68HS9tVwaZAbSM7b4GNeXPr6bWPpoaQGFd28rnEvMjC";

		// Send the transfer
		const result = await this.serverWallet.sendTransfer(params.assetId, receiver, params.amount);

		console.log("result:", result);

		return result?.tx_hash;
	}

	/**
	 * Get asset information
	 */
	async getAssetDetails(assetId: string): Promise<APIAsset> {
		try {
			return await this.serverWallet.getAssetDetails(assetId);
		} catch (error) {
			console.error(`Error getting asset info for ${assetId}:`, error);
			throw error;
		}
	}

	/**
	 * Validate if the amount is valid for the given asset
	 */
	validateAmount(amount: string, decimalPoints: number): boolean {
		const decimals = BigNumber(amount).decimalPlaces();
		return Boolean(decimals) && decimals == decimalPoints;
	}

	/**
	 * Get wallet balances
	 */
	async getBalances(): Promise<BalanceInfo[]> {
		try {
			const balances = await this.serverWallet.getBalances();
			return balances;
		} catch (error) {
			console.error("Error getting balances:", error);
			throw error;
		}
	}

	/**
	 * Get balance for a specific asset
	 */
	async getAssetBalance(assetId: string): Promise<BalanceInfo | null> {
		try {
			const balances = await this.getBalances();
			return balances.find((balance) => balance.asset_info.asset_id === assetId) || null;
		} catch (error) {
			console.error(`Error getting balance for asset ${assetId}:`, error);
			return null;
		}
	}
}
