import { BigNumber } from "bignumber.js";
import { APIAsset, BalanceInfo, ServerWallet } from "zano_web3/server";

import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { Quote } from "../types";

export interface ZanoServiceConfig {
	walletUrl: string;
	daemonUrl: string;
	walletAuthToken: string;
}

export interface ZanoTransferParams {
	assetId: string;
	amount: string; // Amount in asset units (e.g., "10.5" for 10.5 ZANO)
	comment?: string;
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
			walletAuthToken: config.walletAuthToken,
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
	async transferAssets(params: ZanoTransferParams): Promise<string> {
		// Check if we have sufficient balance
		const balances = await this.serverWallet.getBalances();
		const assetBalance = balances.find((balance) => balance.asset_info.asset_id === params.assetId);

		if (assetBalance) {
			const availableBalance = BigNumber(assetBalance.unlocked);
			const fee = BigNumber(0.1);
			const transferAmount = BigNumber(params.amount).plus(fee);

			if (transferAmount.isGreaterThan(availableBalance)) {
				throw new Error(
					`Insufficient balance. Available: ${assetBalance.unlocked} ${assetBalance.ticker || "tokens"}`,
				);
			}
		} else {
			throw new Error(`Sender does not have ${params.assetId} balance.`);
		}

		const vault = await this.fetchVault("ZANO");
		const receiver = vault.address;

		// Send the transfer
		const result = await this.serverWallet.sendTransfer(params.assetId, receiver, params.amount);

		console.debug("result:", result);

		return result.tx_hash;
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
