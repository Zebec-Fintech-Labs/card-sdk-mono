import { UnsupportedChainError } from "./errors";

/**
 * Supported chainIds by zebec instant card sdk.
 */
export enum SupportedChain {
	Mainnet = 1,
	Sepolia = 11155111,
	Base = 8453,
	Bsc = 56,
	BscTestnet = 97,
	Polygon = 137,
	// Bittensor = 558,
	// BittensorTestnet = 559,
	// Ton = -239,
	// TonTestnet = -3,
	// XdbChain = -4,
	// Stellar = -5,
}

export const TESTNET_CHAINIDS = [SupportedChain.Sepolia, SupportedChain.BscTestnet];

export function parseSupportedChain(chainId: number): SupportedChain {
	switch (chainId) {
		case 1:
			return SupportedChain.Mainnet;
		case 11155111:
			return SupportedChain.Sepolia;
		case 8453:
			return SupportedChain.Base;
		case 56:
			return SupportedChain.Bsc;
		case 97:
			return SupportedChain.BscTestnet;
		case 137:
			return SupportedChain.Polygon;
		default:
			throw new UnsupportedChainError(chainId);
	}
}
