import assert from "assert";
import dotenv from "dotenv";

import { AnchorProvider, utils, Wallet, web3 } from "@coral-xyz/anchor";

dotenv.config();

export function getConnection(cluster?: web3.Cluster) {
	if (!cluster || cluster === "mainnet-beta") {
		const RPC_URL = process.env.RPC_URL;
		assert(RPC_URL && RPC_URL !== "", "missing env var: RPC_URL");
		return new web3.Connection(RPC_URL);
	}

	return new web3.Connection(web3.clusterApiUrl(cluster));
}

export function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

export function getWallets(cluster?: web3.Cluster) {
	const SECRET_KEYS =
		cluster && cluster === "mainnet-beta"
			? process.env.MAINNET_SECRET_KEYS
			: process.env.DEVNET_SECRET_KEYS;

	assert(SECRET_KEYS && SECRET_KEYS != "", "missing env var: SECRET_KEYS");
	const wallets: Wallet[] = [];
	try {
		const secretKeys = JSON.parse(SECRET_KEYS);

		for (const keys of secretKeys) {
			// console.log("secret key", keys);
			assert(keys && typeof keys === "string" && keys != "", "Invalid secret key");

			const keypair = web3.Keypair.fromSecretKey(utils.bytes.bs58.decode(keys));
			// console.log(Buffer.from(keypair.secretKey).toJSON());

			wallets.push(new Wallet(keypair));
		}
	} catch (err: any) {
		throw new Error("Some error occured parsing secret key: " + err.message);
	}

	return wallets;
}

export function nowInSec() {
	return Math.floor(Date.now() / 1000);
}

export function getSignTransaction(provider: AnchorProvider) {
	const signTransaction = <T extends web3.Transaction | web3.VersionedTransaction>(
		tx: T,
	): Promise<T> => {
		return provider.wallet.signTransaction(tx);
	};

	return signTransaction;
}

export function getTxUrl(tx: string, cluster: web3.Cluster = "mainnet-beta") {
	if (!cluster || cluster === "mainnet-beta") {
		return "https://solscan.io/tx/" + tx;
	}

	return "https://solscan.io/tx/" + tx + "?cluster=" + cluster;
}
