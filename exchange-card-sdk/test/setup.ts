import assert from "assert";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { Wallet } from "xrpl";

import { Keyring } from "@polkadot/api";
import { Keypair } from "@stellar/stellar-sdk";

dotenv.config();

export function getProvider(chain: "sepolia" | "ethereum" | "base" | "bsc" | "bscTestnet") {
	let rpcUrl: string | undefined;
	switch (chain) {
		case "sepolia":
			rpcUrl = process.env.SEPOLIA_RPC_URL;
			break;
		case "base":
			rpcUrl = process.env.BASE_RPC_URL;
			break;
		case "ethereum":
			rpcUrl = process.env.ETHEREUM_RPC_URL;
			break;
		case "bsc":
			rpcUrl = process.env.BSC_RPC_URL;
			break;
		case "bscTestnet":
			rpcUrl = process.env.BSC_TESTNET_RPC_URL;
			break;
		default:
			throw new Error("Unsupported chain");
	}
	assert(rpcUrl, "Missing env var for rpc url");

	return new ethers.JsonRpcProvider(rpcUrl);
}

export function getSigners(provider: ethers.Provider) {
	dotenv.config();
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

export function getTAOSigner() {
	dotenv.config();
	const mnemonic = process.env.TAO_MNEMONIC;
	assert(mnemonic, "Missing env var TAO_MNEMONIC");

	const keyring = new Keyring({ type: "sr25519" });
	const keypair = keyring.addFromUri(mnemonic);

	return keypair;
}

export function getStellarSigner() {
	dotenv.config();
	const privateKey = process.env.STELLAR_PRIVATE_KEY;
	assert(privateKey, "Missing env var STELLAR_PRIVATE_KEY");

	const keypair = Keypair.fromSecret(privateKey);

	return keypair;
}

export function getXRPLWallet() {
	dotenv.config();

	const secret = process.env.XRPL_SECRET;
	assert(secret, "Missing env var XRPL_SECRET");

	// const seeds = secret.split(" ");
	const wallet = Wallet.fromMnemonic(secret);

	return wallet;
}
