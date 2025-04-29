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

	let signers = privateKeys.map((key) => new ethers.Wallet(key, provider));

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

const BASE_BACKEND_API_URL = "https://api.card.zebec.io";

export async function fetchSwapData(data: {
	src: string;
	dst: string;
	receiver: string;
	from: string;
	origin: string;
	chainId: number;
	slippage: number;
	amount: string;
}) {
	const { amount, chainId, dst, from, origin, receiver, slippage, src } = data;

	// const amount = "0.001";
	// const slippage = "3";
	// const src = "";
	// const receiver = "";
	// const dst = "";
	// const from = "";
	// const origin = "";
	// const chainId = "";

	const urlParams = new URLSearchParams({
		src,
		dst,
		from,
		origin,
		amount,
		slippage: slippage.toString(),
		compatibility: "true",
		chainId: chainId.toString(),
		receiver,
		disableEstimate: "true",
	});

	//api.card.zebec.io/swap/get1inchswapquotes?src=0x9Cf0ED013e67DB12cA3AF8e7506fE401aA14dAd6&dst=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&from=0xCDdb8c03E3B2D04A52771E77B1FAD9daA8a38744&origin=0xCDdb8c03E3B2D04A52771E77B1FAD9daA8a38744&amount=1&slippage=5&compatibility=true&chainId=1&receiver=0xCDdb8c03E3B2D04A52771E77B1FAD9daA8a38744&disableEstimate=true

	const url = BASE_BACKEND_API_URL + `/swap/get1inchswapquotes?${urlParams}`;
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
