// import { ethers } from "ethers";
// import { Keyring } from "@polkadot/api";

import algosdk from "algosdk";
import assert from "assert";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { quais } from "quais";
import { Wallet } from "xrpl";

import { Account } from "@near-js/accounts";
import { KeyPairString } from "@near-js/crypto";
import { JsonRpcProvider } from "@near-js/providers";
import { KeyPairSigner } from "@near-js/signers";
import { Account as AleoAccount } from "@provablehq/sdk/mainnet.js";
import { Keypair } from "@stellar/stellar-sdk";

import { NEAR_RPC_URL } from "../src";

dotenv.config();

export function getEvmProvider(chain: "ogTestnet" | "bobaTestnet" | "octaTestnet") {
	let rpcUrl: string | undefined;
	switch (chain) {
		case "ogTestnet":
			rpcUrl = process.env.OG_TESTNET_RPC_URL;
			break;
		case "bobaTestnet":
			rpcUrl = process.env.BOBA_TESTNET_RPC_URL;
			break;
		case "octaTestnet":
			rpcUrl = process.env.OCTA_TESTNET_RPC_URL;
			break;
		default:
			throw new Error("Unsupported chain");
	}
	assert(rpcUrl, "Missing env var for rpc url");

	return new ethers.JsonRpcProvider(rpcUrl);
}

export function getSigners(provider: ethers.Provider) {
	dotenv.config();
	const privateKeysString = process.env.EVM_PRIVATE_KEYS;
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

// export function getTAOSigner() {
// 	dotenv.config();
// 	const mnemonic = process.env.TAO_MNEMONIC;
// 	assert(mnemonic, "Missing env var TAO_MNEMONIC");

// 	const keyring = new Keyring({ type: "sr25519" });
// 	const keypair = keyring.addFromUri(mnemonic);

// 	return keypair;
// }

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

function assertIsAccount(obj: unknown): asserts obj is {
	account_id: string;
	private_key: KeyPairString;
} {
	if (
		!(
			typeof obj === "object" &&
			obj != null &&
			"account_id" in obj &&
			"private_key" in obj &&
			typeof obj.account_id === "string" &&
			typeof obj.private_key === "string" &&
			obj.private_key.split(":").length === 2 &&
			["ed25519", "secp256k1"].includes(obj.private_key.split(":")[0])
		)
	) {
		throw Error("Parsed named accounts have invalid element");
	}
}

export function getNearAccounts(sandbox: boolean = true) {
	const rawNamedAccounts = process.env.NAMED_ACCOUNTS || "";
	assert(rawNamedAccounts !== "", "Missing NAMED_ACCOUNTS in .env file");

	const parsedNamedAccounts = JSON.parse(rawNamedAccounts);
	if (!Array.isArray(parsedNamedAccounts)) {
		throw new Error("Environment variable `NAMED_ACCOUNTS` has invalid value");
	}

	const accounts: Account[] = [];

	for (let i = 0; i < parsedNamedAccounts.length; i++) {
		const namedAccount = parsedNamedAccounts[i];
		assertIsAccount(namedAccount);
		const signer = KeyPairSigner.fromSecretKey(namedAccount.private_key);
		const url = sandbox ? NEAR_RPC_URL.Sandbox : NEAR_RPC_URL.Production;
		const provider = new JsonRpcProvider({ url });
		const account = new Account(namedAccount.account_id, provider, signer);
		accounts.push(account);
	}

	return accounts;
}

export function getAlgorandAccount() {
	const mnemonic = process.env.ALGORAND_MNEMONIC;
	assert(mnemonic, "Missing env var ALGORAND_MNEMONIC");

	const account = algosdk.mnemonicToSecretKey(mnemonic);

	return account;
}

export function getQuaiProvider() {
	dotenv.config();
	const rpcUrl = process.env.QUAI_RPC_URL;
	assert(rpcUrl, "Missing env var QUAI_RPC_URL");

	const provider = new quais.JsonRpcProvider(rpcUrl, undefined, { usePathing: true });

	return provider;
}

export function getQuaiSigners(provider: quais.Provider) {
	const privateKeysString = process.env.QUAI_PRIVATE_KEYS;
	assert(privateKeysString, "Missing env var PRIVATE_KEYS");

	let privateKeys: string[];
	try {
		const parsed = JSON.parse(privateKeysString);
		assert(Array.isArray(parsed));
		privateKeys = parsed;
	} catch (err) {
		throw new Error("Invalid private key format");
	}

	let signers = privateKeys.map((key) => new quais.Wallet(key, provider));

	return signers;
}

export function getAleoAccount() {
	const privateKey = process.env.ALEO_PRIVATE_KEY;
	assert(privateKey, "Missing env var ALEO_PRIVATE_KEY");
	const account = new AleoAccount({ privateKey });
	return account;
}