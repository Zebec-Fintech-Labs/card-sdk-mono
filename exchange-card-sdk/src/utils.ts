import type algosdk from "algosdk";
import { BigNumber } from "bignumber.js";

import { ALEO_NETWORK_CLIENT_URL } from "./constants";

/**
 * Convert ALGO to microAlgos
 * @param algos Amount in ALGO
 * @returns Amount in microAlgos
 */
export function parseAlgo(algos: number | string): bigint {
	return BigInt(BigNumber(algos).times(1_000_000).toFixed(0));
}

/**
 * Convert microAlgos to ALGO
 * @param microAlgos Amount in microAlgos
 * @returns Amount in ALGO
 */
export function formatAlgo(microAlgos: number | bigint): string {
	return BigNumber(microAlgos).div(1_000_000).toFixed();
}

/**
 * Convert Amount to micro-token amount (base units)
 * @param amount Amount in decimal units
 * @param decimals Number of decimals for the asset
 * @returns Amount in micro-token base units
 */
export function parseAlgorandAsset(amount: number | string, decimals: number): bigint {
	return BigInt(BigNumber(amount).times(BigNumber(10).pow(decimals)).toFixed(0));
}

/**
 * Convert micro-token Amount to Amount
 * @param microAmount Amount in micro units
 * @param decimals Number of decimals for the asset
 * @returns Amount in decimal units
 */
export function formatAlgorandAsset(microAmount: number | bigint, decimals: number): string {
	return BigNumber(microAmount).div(BigNumber(10).pow(decimals)).toFixed();
}

const ALGORAND_ASSET_DECIMALS_CACHE = new Map<number, number>();

/**
 *
 * @param client Algod Client
 * @param assetId asset index of Asset
 * @returns
 */
export async function getAssetDecimals(client: algosdk.Algodv2, assetId: number): Promise<number> {
	// Check if we already have this value cached
	if (ALGORAND_ASSET_DECIMALS_CACHE.has(assetId)) {
		const value = ALGORAND_ASSET_DECIMALS_CACHE.get(assetId);

		if (value) {
			return value;
		} else {
			throw new Error("Cached value is undefined, this should not happen");
		}
	}

	const assetInfo = await client.getAssetByID(assetId).do();
	const decimals = assetInfo.params.decimals;
	// Cache the result for future use
	ALGORAND_ASSET_DECIMALS_CACHE.set(assetId, decimals);

	return decimals;
}

/**
 * Convert credits to microcredits
 */
export function creditsToMicrocredits(credits: BigNumber.Value, decimals = 6) {
	return BigNumber(credits).times(BigNumber(10).pow(decimals)).toFixed(0);
}

/**
 * Convert microcredits to credits
 */
export function microcreditsToCredits(microcredits: BigNumber.Value, decimals = 6) {
	return BigNumber(microcredits).div(BigNumber(10).pow(decimals)).toFixed();
}

export type TokenMetadata = {
	token_id: string;
	token_id_datatype: string | null;
	symbol: string;
	display: string;
	program_name: string;
	decimals: number;
	total_supply: string;
	verified: boolean;
	token_icon_url: string;
	compliance_freeze_list: string;
	price: string;
	price_change_percentage_24h: string;
	fully_diluted_value: string;
	total_market_cap: string;
	volume_24h: string;
};

export async function getTokenBySymbol(
	tokenSymbol: string,
	network: "mainnet" | "testnet" = "mainnet",
): Promise<TokenMetadata> {
	const response = await fetch(
		`${ALEO_NETWORK_CLIENT_URL}/${network}/tokens?symbol=${encodeURIComponent(tokenSymbol)}`,
	);

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`Failed to fetch token decimals for ${tokenSymbol}: ${response.statusText} ${body}`.trim(),
		);
	}

	const result = await response.json();
	const tokens = Array.isArray(result) ? result : result?.data;

	if (!Array.isArray(tokens) || tokens.length === 0) {
		throw new Error(`No token found with symbol ${tokenSymbol}`);
	}

	return tokens.find((token) => token.verified) ?? tokens[0];
}
