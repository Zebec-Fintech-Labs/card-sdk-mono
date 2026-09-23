import assert from "assert";
import dotenv from "dotenv";
import { ethers } from "ethers";

import { SupportedChain, USDC_ADDRESS, WETH_ADDRESS, ZEBEC_CARD_ADDRESS } from "../src";

dotenv.config();

const ONE_INCH_ROUTER_ABI = [
	"function swap(address executor, tuple(address srcToken, address dstToken, address srcReceiver, address dstReceiver, uint256 amount, uint256 minReturnAmount, uint256 flags) desc, bytes data)",
];

const ONE_INCH_IFACE = new ethers.Interface(ONE_INCH_ROUTER_ABI);

function chainNameToId(chainName: string): SupportedChain {
	switch (chainName.toUpperCase()) {
		case "ETHEREUM":
			return SupportedChain.Mainnet;
		case "SEPOLIA":
			return SupportedChain.Sepolia;
		case "BASE":
			return SupportedChain.Base;
		case "BSC":
			return SupportedChain.Bsc;
		case "BSC_TESTNET":
			return SupportedChain.BscTestnet;
		case "ODYSSEY":
			return SupportedChain.Odyssey;
		case "ODYSSEY_TESTNET":
			return SupportedChain.OdysseyTestnet;
		case "POLYGON":
			return SupportedChain.Polygon;
		case "POLYGON_AMOY":
			return SupportedChain.PolygonAmoy;
		case "ROBINHOOD":
			return SupportedChain.Robinhood;
		case "ROBINHOOD_TESTNET":
			return SupportedChain.RobinhoodTestnet;
		default:
			throw new Error(`Unsupported chain name: ${chainName}`);
	}
}

async function fetch1inchSwapData(data: {
	amount: string;
	chainId: SupportedChain;
	slippage: number;
	srcSymbol: string;
	from: string;
}) {
	const ONE_INCH_AUTH_TOKEN = process.env.ONE_INCH_AUTH_TOKEN;
	assert(ONE_INCH_AUTH_TOKEN, "Missing env var ONE_INCH_AUTH_TOKEN");

	const { amount, chainId, slippage, srcSymbol, from } = data;

	const wethAddress = WETH_ADDRESS[chainId];
	const usdcAddress = USDC_ADDRESS[chainId];
	const zebecCardAddress = ZEBEC_CARD_ADDRESS[chainId];

	assert(wethAddress, `WETH address not found for chain ${chainId}`);
	assert(usdcAddress, `USDC address not found for chain ${chainId}`);
	assert(zebecCardAddress, `ZebecCard address not found for chain ${chainId}`);

	const src = srcSymbol.toUpperCase() === "ETH" ? wethAddress : srcSymbol;
	const dst = usdcAddress;
	const amountInWei = ethers.parseUnits(amount, 18).toString();

	const url = new URL(`https://api.1inch.dev/swap/v6.0/${chainId}/swap`);
	url.searchParams.append("src", src);
	url.searchParams.append("dst", dst);
	url.searchParams.append("amount", amountInWei);
	url.searchParams.append("from", from);
	url.searchParams.append("slippage", slippage.toString());
	url.searchParams.append("disableEstimate", "true");
	url.searchParams.append("allowPartialFill", "false");

	console.log("1inch url:", url.toString());

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${ONE_INCH_AUTH_TOKEN}`,
			Accept: "application/json",
		},
	});

	const responseData = await response.json();
	if (!response.ok || responseData.error) {
		throw new Error(`1inch API error: ${JSON.stringify(responseData)}`);
	}
	console.log("1inch response:", responseData);

	// Decode tx.data to extract swap parameters
	const txData = responseData.tx.data;
	console.log("1inch tx data:", txData);
	const decoded = ONE_INCH_IFACE.decodeFunctionData("swap", txData);

	const executor = decoded[0] as string;
	const desc = decoded[1] as {
		srcToken: string;
		dstToken: string;
		srcReceiver: string;
		dstReceiver: string;
		amount: bigint;
		minReturnAmount: bigint;
		flags: bigint;
	};
	const routeData = decoded[2] as string;

	// For 1inch v6 contract-mediated swaps, srcReceiver must be the executor
	// so tokens are routed to the executor before swap execution.
	// USDC output goes to ZebecCard so it can process the card purchase.
	const adjustedDesc = {
		srcToken: desc.srcToken,
		dstToken: desc.dstToken,
		srcReceiver: executor,
		dstReceiver: zebecCardAddress,
		srcAmount: ethers.formatUnits(desc.amount, 18),
		minReturnAmount: ethers.formatUnits(desc.minReturnAmount, 6),
		flags: desc.flags.toString(),
	};

	return {
		dstAmount: responseData.dstAmount,
		from: responseData.tx.from,
		to: responseData.tx.to,
		swapParams: {
			executor,
			description: adjustedDesc,
			routeData,
		},
		ether: responseData.tx.value || "0",
	};
}

export function getSigners(provider: ethers.Provider) {
	const privateKeysString = process.env.PRIVATE_KEYS;
	assert(privateKeysString, "Missing env var PRIVATE_KEYS");

	let privateKeys: string[];
	try {
		const parsed = JSON.parse(privateKeysString);
		assert(Array.isArray(parsed));
		privateKeys = parsed;
	} catch (err) {
		throw new Error("Invalid private key format");
	}

	let signers = privateKeys.map((key) => {
		const wallet = new ethers.Wallet(key, provider);
		console.log("wallet:", wallet.address);
		return wallet;
	});

	return signers;
}

function getRpcUrlForChain(chain: SupportedChain) {
	let rpcUrl: string | undefined;
	switch (chain) {
		case 11155111:
			rpcUrl = process.env.SEPOLIA_RPC_URL;
			break;
		case 8453:
			rpcUrl = process.env.BASE_RPC_URL;
			break;
		case 1:
			rpcUrl = process.env.ETHEREUM_RPC_URL;
			break;
		case 56:
			rpcUrl = process.env.BSC_RPC_URL;
			break;
		case 97:
			rpcUrl = process.env.BSC_TESTNET_RPC_URL;
			break;
		case 131313:
			rpcUrl = process.env.ODYSSEY_TESTNET_RPC_URL;
			break;
		case 153153:
			rpcUrl = process.env.ODYSSEY_RPC_URL;
			break;
		case 137:
			rpcUrl = process.env.POLYGON_RPC_URL;
			break;
		case 80002:
			rpcUrl = process.env.POLYGON_AMOY_RPC_URL;
			break;
		case 46630:
			rpcUrl = process.env.ROBINHOOD_TESTNET_RPC_URL;
			break;
		case 4663:
			rpcUrl = process.env.ROBINHOOD_RPC_URL;
			break;
		default:
			throw new Error("Unsupported chain");
	}

	assert(rpcUrl, "Missing env var for rpc url");
	return rpcUrl;
}
export function getProvider(chain: SupportedChain) {
	console.log("here: from provider");
	const url = getRpcUrlForChain(chain);
	console.debug("url:", url);
	return new ethers.JsonRpcProvider(url);
}

// export const ONE_INCH_ROUTER_V6_ADDRESS = "0x111111125421cA6dc452d289314280a0f8842A65";

const BASE_BACKEND_API_URL = "https://api.superapp.zebec.io";

export async function fetchSwapData(data: {
	srcSymbol: string;
	slippage: number;
	chainName: string;
	amount: string;
	type: "EXACT_IN" | "EXACT_OUT";
	platform?: string;
}) {
	const { amount, chainName, slippage, srcSymbol, type, platform } = data;

	const urlParams = new URLSearchParams({
		chainName: chainName.toUpperCase(),
		slippage: slippage.toString(),
		platform: platform ?? "zebec-super-app",
		type,
	});

	// https://api.superapp.zebec.io/tokens/quotes/ZBCN_USD/10?type=EXACT_IN&slippage=1&platform=zebec-super-app&chainName=SOLANA
	const url = BASE_BACKEND_API_URL + `/tokens/quotes/${srcSymbol}_USD/${amount}?${urlParams}`;
	console.log("url:", url);

	const response = await (
		await fetch(url, {
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=utf-8",
			},
		})
	).json();

	// If Zebec backend doesn't support this chain, fall back to 1inch API
	// if ("error" in response || response.statusCode === 404) {
	// 	console.log("Zebec API failed, falling back to 1inch...");
	// 	assert(from, "Missing 'from' address required for 1inch fallback");
	// 	const chainId = chainNameToId(chainName);
	// 	return fetch1inchSwapData({ amount, chainId, slippage, srcSymbol, from });
	// }

	return response;
}
