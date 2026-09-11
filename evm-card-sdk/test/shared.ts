import assert from "assert";
import dotenv from "dotenv";
import { ethers } from "ethers";

import { SupportedChain } from "../src";

dotenv.config();

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

export const ONE_INCH_ROUTER_V6_ADDRESS = "0x111111125421cA6dc452d289314280a0f8842A65";

const BASE_BACKEND_API_URL = "https://api.superapp.zebec.io";

export async function fetchSwapData(data: {
	srcSymbol: string;
	slippage: number;
	chainName: string;
	amount: string;
	type: "EXACT_IN" | "EXACT_OUT";
}) {
	const { amount, chainName, slippage, srcSymbol, type } = data;

	const urlParams = new URLSearchParams({
		chainName: chainName.toUpperCase(),
		slippage: slippage.toString(),
		platform: "zebec-super-app",
		type,
	});

	// https://api.superapp.zebec.io/tokens/quotes/ZBCN_USD/10?type=EXACT_IN&slippage=1&platform=zebec-super-app&chainName=SOLANA
	const url = BASE_BACKEND_API_URL + `/swap/quotes/${srcSymbol}_USD/${amount}?${urlParams}`;
	console.log("url:", url);

	const response = await (
		await fetch(url, {
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=utf-8",
			},
		})
	).json();

	return response;
}
