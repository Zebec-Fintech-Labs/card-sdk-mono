// import { ethers } from "ethers";
// import { Keyring } from "@polkadot/api";

import { Account } from "@near-js/accounts";
import type { KeyPairString } from "@near-js/crypto";
import { JsonRpcProvider } from "@near-js/providers";
import { KeyPairSigner } from "@near-js/signers";
import {
	Account as AleoAccount,
	AleoKeyProvider,
	AleoNetworkClient,
	NetworkRecordProvider,
	ProgramManager,
	RecordScanner,
} from "@provablehq/sdk/testnet.js";
import { Keypair } from "@stellar/stellar-sdk";
import algosdk from "algosdk";
import assert from "assert";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { quais } from "quais";
import { Wallet } from "xrpl";

import { ALEO_NETWORK_CLIENT_URL, AleoWallet, NEAR_RPC_URL } from "../src";

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

	const signers = privateKeys.map((key) => new ethers.Wallet(key, provider));

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

	const provider = new quais.JsonRpcProvider(rpcUrl, undefined, {
		usePathing: true,
	});

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

	const signers = privateKeys.map((key) => new quais.Wallet(key, provider));

	return signers;
}

export function getAleoAccounts() {
	const privateKeysString = process.env.ALEO_PRIVATE_KEYS;
	assert(privateKeysString, "Missing env var ALEO_PRIVATE_KEYS");
	let parsedKeys: string[];

	try {
		parsedKeys = JSON.parse(privateKeysString);
		assert(Array.isArray(parsedKeys));
	} catch (_err) {
		throw new Error("Invalid ALEO_PRIVATE_KEYS format");
	}

	return parsedKeys.map((key) => {
		if (typeof key !== "string") {
			throw new Error("Invalid ALEO_PRIVATE_KEYS format: all keys must be strings");
		}
		const account = new AleoAccount({ privateKey: key });
		return account;
	});
}

const programSourceCache = new Map<string, string>();

function networkRetries(): number {
	const configured = Number(process.env.NETWORK_RETRIES ?? "3");
	return Number.isInteger(configured) && configured > 0 ? configured : 3;
}

function retryDelay(attempt: number): number {
	return Math.min(1000 * 2 ** (attempt - 1), 5000);
}

function provingRetries(): number {
	const configured = Number(process.env.PROVING_RETRIES ?? process.env.NETWORK_RETRIES ?? "8");
	return Number.isInteger(configured) && configured > 0 ? configured : 8;
}

async function loadProgramSource(
	networkClient: AleoNetworkClient,
	programId: string,
): Promise<string> {
	const cached = programSourceCache.get(programId);
	if (cached !== undefined) return cached;

	let lastError: unknown;
	for (let attempt = 1; attempt <= networkRetries(); attempt++) {
		try {
			const source = await networkClient.getProgram(programId);
			programSourceCache.set(programId, source);
			return source;
		} catch (error) {
			lastError = error;
			if (attempt === networkRetries()) break;
			console.warn(
				`[e2e] fetching ${programId} failed (attempt ${attempt}/${networkRetries()}); retrying in ${retryDelay(attempt)}ms`,
			);
			await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
		}
	}

	const endpoint = process.env.ENDPOINT ?? ALEO_NETWORK_CLIENT_URL;
	throw new Error(
		`Unable to fetch ${programId} from ${endpoint} after ${networkRetries()} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
	);
}

function isPubkeyAuthError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	const status =
		error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
	return status === 401 || /401 could not get URL|\/pubkey/.test(message);
}

function provingRetryDelay(attempt: number, pubkeyAuthError: boolean): number {
	if (pubkeyAuthError) {
		return Math.min(5000 * attempt, 30000);
	}
	return Math.min(retryDelay(attempt) * 2, 15000);
}

export async function createAleoWallet(account: AleoAccount) {
	const host = process.env.ENDPOINT ?? ALEO_NETWORK_CLIENT_URL;
	const proverUri = process.env.PROVER_URI ?? "https://api.provable.com/prove";
	const recordScannerUri = process.env.RECORD_SCANNER_URI ?? "https://api.provable.com/scanner";

	const apiKey = process.env.PROVABLE_API_KEY ?? process.env.PROVER_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: PROVER_API_KEY");
	}
	const consumerId = process.env.PROVABLE_CONSUMER_ID ?? process.env.PROVER_CONSUMER_ID;
	if (!consumerId) {
		throw new Error("Missing environment variable: PROVER_CONSUMER_ID");
	}

	const networkClient = new AleoNetworkClient(host);

	networkClient.setProverUri(proverUri);
	networkClient.setRecordScannerUri(recordScannerUri);

	const wallet: AleoWallet = {
		address: account.address().to_string(),
		decrypt: async (ct) => {
			return account.decryptRecord(ct).toString();
		},
		requestRecords: async (program, includePlaintext) => {
			const recordScanner = new RecordScanner({ url: recordScannerUri });
			recordScanner.setApiKey(apiKey);
			recordScanner.setConsumerId(consumerId);

			const regResult = await recordScanner.registerEncrypted(account.viewKey(), 0);
			if (!regResult.ok) {
				throw new Error(regResult.error?.message ?? `Registration failed: ${regResult.status}`);
			}
			const uuid = regResult.data.uuid;

			const records = await recordScanner.findRecords({
				uuid,
				unspent: true,
				responseFilter: {
					record_ciphertext: true,
					record_name: true,
					owner: true,
					spent: true,
					program_name: true,
					function_name: true,
				},
				filter: { programs: [program] },
			});
			console.debug(`Fetched ${records.length} records for program ${program}`);
			return records.map((r) => ({
				...r,
				recordCiphertext: r.record_ciphertext,
				recordPlaintext: includePlaintext ? r.record_plaintext : undefined,
			}));
		},
		executeTransaction: async (options) => {
			const keyProvider = new AleoKeyProvider();
			const recordProvider = new NetworkRecordProvider(account, networkClient);
			const programManager = new ProgramManager(host, keyProvider, recordProvider);
			programManager.setAccount(account);

			const imports = new Set(options.imports ?? []);
			imports.add(options.program);

			const programImports: Record<string, string> = {};

			for (const i of imports) {
				const source = await loadProgramSource(networkClient, i);
				programImports[i] = source;
			}

			let lastError: unknown;
			let provingClient = networkClient;
			for (let attempt = 1; attempt <= provingRetries(); attempt++) {
				try {
					// Rebuild the request on every attempt: DPS pubkey 401s
					// leave a consumed/stale ProvingRequest that will not succeed
					// if resubmitted as-is.
					const provingRequest = await programManager.provingRequest({
						programName: options.program,
						functionName: options.function,
						// Provable SDK takes priority fee in credits; this wallet
						// adapter receives microcredits from ZebecStreamService.
						priorityFee: (options.fee ?? 0) / 1_000_000,
						privateFee: options.privateFee ?? false,
						feeRecord: options.feeRecord,
						inputs: options.inputs,
						programImports,
						broadcast: true,
					});

					const response = await provingClient.submitProvingRequest({
						provingRequest,
						apiKey,
						consumerId,
					});

					const broadcast = response.broadcast_result;
					if (broadcast.status.toLowerCase() !== "accepted") {
						const detail = "message" in broadcast ? broadcast.message : undefined;
						throw new Error(
							`proving service failed to broadcast the transaction (status: ${broadcast.status})${detail ? `: ${detail}` : ""}`,
						);
					}

					return { transactionId: response.transaction.id };
				} catch (error) {
					lastError = error;
					const message = error instanceof Error ? error.message : String(error);
					const status =
						error && typeof error === "object" && "status" in error
							? Number(error.status)
							: undefined;
					const pubkeyAuthError = isPubkeyAuthError(error);
					const retryable =
						pubkeyAuthError ||
						status === 500 ||
						status === 503 ||
						/503|ECONNRESET|ETIMEDOUT/.test(message);
					if (!retryable || attempt === provingRetries()) break;
					if (pubkeyAuthError) {
						// DPS 401 on /pubkey is often a sticky JWT/session.
						// Drop the cached token and use a fresh client.
						provingClient.jwtData = undefined;
						provingClient = new AleoNetworkClient(host);
						provingClient.setProverUri(proverUri);
						provingClient.setRecordScannerUri(recordScannerUri);
					}
					const delay = provingRetryDelay(attempt, pubkeyAuthError);
					console.warn(
						`[e2e] proving submit failed (attempt ${attempt}/${provingRetries()}); retrying in ${delay}ms`,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
			throw lastError instanceof Error ? lastError : new Error(String(lastError));
		},
	};

	return wallet;
}
