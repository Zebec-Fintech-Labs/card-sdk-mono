import dotenv from "dotenv";

dotenv.config();

const SDK_ENV = process.env.SDK_ENV ?? "production";

export const isSdkEnvDev = SDK_ENV === "development";

/**
 * Zebec Card Program Ids
 */
export const ZEBEC_CARD_PROGRAM: Record<"devnet" | "mainnet-beta", string> = {
	/** Mainnet Program Id */
	["mainnet-beta"]: "HxZq3iRwN2a2myikHz8JNVufJ7FM92xV8kNvFpQaRgKd",
	/** Devnet Program Id */
	devnet: "HxZq3iRwN2a2myikHz8JNVufJ7FM92xV8kNvFpQaRgKd",
};

export const CARD_PROGRAM_SEEDS = {
	cardPdaSeed: "zic_instant_card_inits",
	userPdaSeed: "user_vault",
	vaultInfoSeed: "vault_pda",
	buyerPdaSeed: "buyer_prepaid",
	feeMapPdaSeed: "token_fees_map",
	cardBotPdaSeed: "card_bot",
	onRampConfigSeed: "onramp_configs",
	onRampUserCustodySeed: "on_ramp_custody",
	reloadAbleSeed: "reloadable",
};

// export const FLEXLEND_PROGRAM_SEEDS = {
// 	promotionReserve: "promotion_reserve",
// 	flexlend: "flexlend",
// };

// /** Flexlend Program ID */
// export const FLEXLEND_PROGRAM_ID = new PublicKey("FL3X2pRsQ9zHENpZSKDRREtccwJuei8yg9fwDu9UN69Q");
// /**
//  * Flexlend reserve admin key
//  */
// export const FLEXLEND_RESERVE_ADMIN = new PublicKey("4kpV5FK5qWuCoGnwVUkaAgtwfz769u3hpz53N1Ur1MrU");

export const CARD_LOOKUP_TABLE_ADDRESS = "Dw9K5oGzAsXybijfgKaJG2ka3WT2sfDoL6SnbCH9kWz";

export const JUP_SWAP_API = "https://quote-api.jup.ag/v6/swap";
