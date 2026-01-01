import algosdk from "algosdk";
import { BigNumber } from "bignumber.js";

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
		return ALGORAND_ASSET_DECIMALS_CACHE.get(assetId)!;
	}

	const assetInfo = await client.getAssetByID(assetId).do();
	const decimals = assetInfo.params.decimals;
	// Cache the result for future use
	ALGORAND_ASSET_DECIMALS_CACHE.set(assetId, decimals);

	return decimals;
}
