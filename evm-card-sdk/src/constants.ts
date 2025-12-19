/**
 * Supported Chain Ids by SDK
 */
export enum SupportedChain {
	Mainnet = 1,
	Sepolia = 11155111,
	Base = 8453,
	Bsc = 56,
	BscTestnet = 97,
	OdysseyTestnet = 131313,
	Odyssey = 153153,
	Polygon = 137,
	PolygonAmoy = 80002,
}

export function parseSupportedChain(chainId: number) {
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
		case 131313:
			return SupportedChain.OdysseyTestnet;
		case 153153:
			return SupportedChain.Odyssey;
		case 137:
			return SupportedChain.Polygon;
		case 80002:
			return SupportedChain.PolygonAmoy;
		default:
			throw new Error(`Chain Id: ${chainId} not supported.`);
	}
}

/**
 * Odyssey chain ids
 */
export const ODYSSEY_CHAIN_IDS = [SupportedChain.Odyssey, SupportedChain.OdysseyTestnet];

export const ZEBEC_CARD_ADDRESS: Record<SupportedChain, string> = {
	[SupportedChain.Sepolia]: "0xD0e8f23ACcC1a7147Fb17E078A5cbe7ff1F47407",
	[SupportedChain.Base]: "0x1bF6419D8555EafaE79142D309534e8aBd54aBa3",
	[SupportedChain.Mainnet]: "0xB4f6E946E12200F4E0ba3B352B8DbF0a66635b53",
	[SupportedChain.Bsc]: "0x1bF6419D8555EafaE79142D309534e8aBd54aBa3",
	[SupportedChain.BscTestnet]: "0x53E1Ffb703298744670a7Fd341F90AC7949D7516",
	[SupportedChain.OdysseyTestnet]: "0x597fA3656FF24034939edce2d74480c0619F51A7",
	[SupportedChain.Odyssey]: "0x935D149eCB4E3F3824327e7d4357180a08aE8a15",
	[SupportedChain.Polygon]: "0xB4f6E946E12200F4E0ba3B352B8DbF0a66635b53",
	[SupportedChain.PolygonAmoy]: "0xB4f6E946E12200F4E0ba3B352B8DbF0a66635b53",
};

export const USDC_ADDRESS: Record<SupportedChain, string> = {
	[SupportedChain.Sepolia]: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
	[SupportedChain.Base]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
	[SupportedChain.Mainnet]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
	[SupportedChain.Bsc]: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
	[SupportedChain.BscTestnet]: "0xF8Dc6f35a10244213096D86c376491042594a84e",
	[SupportedChain.OdysseyTestnet]: "0x1bF6419D8555EafaE79142D309534e8aBd54aBa3",
	[SupportedChain.Odyssey]: "0x8aBEE32587864cce7000e6f2820680874eD6100A",
	[SupportedChain.Polygon]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
	[SupportedChain.PolygonAmoy]: "0x935d149ecb4e3f3824327e7d4357180a08ae8a15",
};

export const WETH_ADDRESS: Record<SupportedChain, string> = {
	[SupportedChain.Sepolia]: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
	[SupportedChain.Base]: "0x4200000000000000000000000000000000000006",
	[SupportedChain.Bsc]: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
	[SupportedChain.BscTestnet]: "0x094616F0BdFB0b526bD735Bf66Eca0Ad254ca81F",
	[SupportedChain.Mainnet]: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
	[SupportedChain.OdysseyTestnet]: "0xF21Cbaf7bD040D686Bd390957770D2ea652E4013",
	[SupportedChain.Odyssey]: "0xF21Cbaf7bD040D686Bd390957770D2ea652E4013",
	[SupportedChain.Polygon]: "0x0000000000000000000000000000000000001010",
	[SupportedChain.PolygonAmoy]: "0x0000000000000000000000000000000000000000",
};

export const ATOKEN_ADDRESS: Record<SupportedChain, string> = {
	[SupportedChain.Sepolia]: "0x16dA4541aD1807f4443d92D26044C1147406EB80",
	[SupportedChain.Base]: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
	[SupportedChain.Bsc]: "0x00901a076785e0906d1028c7d6372d247bec7d61",
	[SupportedChain.BscTestnet]: "0x0000000000000000000000000000000000000000",
	[SupportedChain.Mainnet]: "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c",
	[SupportedChain.OdysseyTestnet]: "0x0000000000000000000000000000000000000000",
	[SupportedChain.Odyssey]: "0x0000000000000000000000000000000000000000",
	[SupportedChain.Polygon]: "0x0000000000000000000000000000000000000000",
	[SupportedChain.PolygonAmoy]: "0x0000000000000000000000000000000000000000",
};

export const DEFAULT_GAS_LIMIT = 3000000; // Default gas limit for transactions
