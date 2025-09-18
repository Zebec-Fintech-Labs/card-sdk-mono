import { BobaChainId, QuaiChainId } from "./types";

export const CARD_API_URL: Record<"Production" | "Sandbox", string> = {
	Production: "https://cex.card.zebec.io",
	Sandbox: "https://cex.card.zebec.io",
};

export const NEAR_RPC_URL: Record<"Production" | "Sandbox", string> = {
	Production: process.env.NEAR_RPC_URL ? process.env.NEAR_RPC_URL : "https://rpc.mainnet.near.org",
	Sandbox: "https://rpc.testnet.near.org",
};

export const XRPL_RPC_URL: Record<"Production" | "Sandbox", string> = {
	Production: "wss://xrplcluster.com",
	Sandbox: "wss://s.altnet.rippletest.net:51233",
};

export const STELLAR_RPC_URL: Record<"Production" | "Sandbox", string> = {
	Production: "https://horizon.stellar.org",
	Sandbox: "https://horizon-testnet.stellar.org",
};

export const XDB_RPC_URL: Record<"Production" | "Sandbox", string> = {
	Production: "https://horizon.livenet.xdbchain.com/",
	Sandbox: "https://horizon.futurenet.xdbchain.com/",
};

export const XDB_NETWORK = {
	PUBLIC: "LiveNet Global XDBChain Network ; November 2023",
	TESTNET: "Futurenet XDBChain Network ; October 2023",
} as const;

// Add USDC asset constants
export const STELLAR_USDC_ISSUER = {
	Sandbox: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
	Production: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
} as const;

export const BITCOIN_ENDPOINTS = {
	Sandbox: "https://mempool.space/testnet/api",
	Production: "https://mempool.space/api",
} as const;

export const BOBA_CHAIN_ID: Record<"mainnet" | "testnet", BobaChainId> = {
	mainnet: 288,
	testnet: 28882,
};

export const QUAI_CHAIN_ID: Record<"mainnet" | "testnet", QuaiChainId> = {
	mainnet: 9,
	testnet: 15000,
};

export const DEFAULT_EVM_GAS_LIMIT = 3000000;

export const DEFAULT_QUAI_GAS_LIMIT = 2000000;
export const DEFAULT_QUAI_GAS_PRICE = 1000000000;

export const PLATFORM_FEE = 5 * 100;
