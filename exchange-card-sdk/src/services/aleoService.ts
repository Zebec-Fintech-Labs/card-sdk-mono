import { ALEO_NETWORK_CLIENT_URL } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";
import { fromMicroUnits, getTokenBySymbol, toMicroUnits } from "../utils";

export type ProvableSdk =
	| typeof import("@provablehq/sdk/mainnet.js")
	| typeof import("@provablehq/sdk/testnet.js");

/** Public Aleo REST client surface used by this SDK (network-agnostic). */
export type ProvableNetworkClient = {
	getProgramImports: (programId: string) => Promise<Record<string, unknown>>;
	getProgramObject: (programId: string) => Promise<{
		address: () => { to_string: () => string };
		free: () => void;
	}>;
	getProgramMappingValue: (
		programId: string,
		mapping: string,
		key: string,
	) => Promise<string | undefined | null>;
	getProgramMappingNames: (programId: string) => Promise<string[]>;
	getPublicBalance: (address: string) => Promise<number>;
};

const sdkByNetwork = new Map<Network, Promise<ProvableSdk>>();

/**
 * Dynamically import the Provable SDK for `network`. Cached per network so
 * subsequent calls reuse the same WASM instance.
 */
export function loadProvableSdk(network: Network): Promise<ProvableSdk> {
	let pending = sdkByNetwork.get(network);
	if (pending === undefined) {
		const loaded: Promise<ProvableSdk> =
			network === Network.MAINNET
				? import("@provablehq/sdk/mainnet.js")
				: import("@provablehq/sdk/testnet.js");
		pending = loaded.then((sdk) => {
			return sdk;
		});
		sdkByNetwork.set(network, pending);
	}
	return pending;
}

/**
 * Supported Aleo networks
 */
export enum Network {
	MAINNET = "mainnet",
	TESTNET = "testnet",
}

/**
 * Transaction creation options
 */
export interface TransactionOptions {
	/**
	 * The program to execute
	 */
	program: string;
	/**
	 * The function to call
	 */
	function: string;
	/**
	 * The function inputs
	 */
	inputs: string[];
	/**
	 * The transaction fee to pay
	 */
	fee?: number;
	/** Record to use for paying the transaction fee */
	feeRecord?: string;
	/**
	 * Record indices to use
	 */
	recordIndices?: number[];
	/**
	 * Whether the fee is private
	 */
	privateFee?: boolean;
	/**
	 * Program names the wallet must load as external stacks for
	 * `call.dynamic` dispatch. See `DYNAMIC_DISPATCH_IMPORTS`.
	 */
	imports?: string[];
}

interface AleoNetworkClientOptions {
	headers?: {
		[key: string]: string;
	};
	host?: string;
	proverUri?: string;
	recordScannerUri?: string;
}

export interface AleoWallet {
	address: string;
	decrypt: (cipherText: string) => Promise<string>;
	requestRecords: (program: string, includePlaintext?: boolean | undefined) => Promise<unknown[]>;
	executeTransaction: (options: TransactionOptions) => Promise<{
		transactionId: string;
	}>;
}

export type AleoTransferCreditParams = {
	amount: number | string;
	transferType?: "public" | "private";
	fee?: number;
	privateFee?: boolean;
	recipient?: string; // Optional recipient address, defaults to vault if not provided
};

export type AleoTransferStableCoinParams = {
	programId: "usad_stablecoin.aleo" | "usdcx_stablecoin.aleo";
	amount: number | string;
	transferType?: "public" | "private";
	fee?: number;
	privateFee?: boolean;
	recipient?: string; // Optional recipient address, defaults to vault if not provided
};

export const NETWORK_CONFIG = {
	[Network.MAINNET]: {
		explorer: "https://explorer.provable.com/transaction",
		stablecoins: {
			usad: "usad_stablecoin.aleo",
			usdcx: "usdcx_stablecoin.aleo",
		},
		freezeListApi: {
			usad: "https://api.explorer.provable.com/v2/mainnet/programs/usad_freezelist.aleo/compliance/freeze-list",
			usdcx:
				"https://api.explorer.provable.com/v2/mainnet/programs/usdcx_freezelist.aleo/compliance/freeze-list",
		},
	},
	[Network.TESTNET]: {
		explorer: "https://explorer.provable.com/testnet/transaction",
		stablecoins: {
			usad: "test_usad_stablecoin.aleo",
			usdcx: "test_usdcx_stablecoin.aleo",
		},
		freezeListApi: {
			usad: "https://api.explorer.provable.com/v2/testnet/programs/test_usad_freezelist.aleo/compliance/freeze-list",
			usdcx:
				"https://api.explorer.provable.com/v2/testnet/programs/test_usdcx_freezelist.aleo/compliance/freeze-list",
		},
	},
};

export class AleoService {
	readonly wallet: AleoWallet;
	readonly sandbox: boolean;
	readonly apiService: ZebecCardAPIService;
	private readonly sdkReady: Promise<ProvableNetworkClient>;
	readonly network: Network;
	readonly host: string;

	constructor(
		wallet: AleoWallet,
		aleoNetworkClientOptions?: AleoNetworkClientOptions,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		this.wallet = wallet;
		this.sandbox = sdkOptions?.sandbox || false;
		this.network = this.sandbox ? Network.TESTNET : Network.MAINNET;
		this.host = aleoNetworkClientOptions?.host || ALEO_NETWORK_CLIENT_URL;
		this.apiService = new ZebecCardAPIService(sdkOptions?.sandbox || false);
		this.sdkReady = loadProvableSdk(this.network).then((sdk) => {
			const client: ProvableNetworkClient = new sdk.AleoNetworkClient(this.host);
			return client;
		});
	}

	/**
	 * Resolves when this network's Provable SDK (and WASM) has loaded.
	 * Async methods wait on this automatically; await it before reading
	 * {@link networkClient} directly.
	 */
	async ready(): Promise<this> {
		await this.sdkReady;
		return this;
	}

	async client(): Promise<ProvableNetworkClient> {
		return this.sdkReady;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVaultByTokenAddress(address: string): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVaultByTokenAddress(address);
		return data;
	}

	/**
	 * Fetch unspent records for a program, decrypt them, and return the one
	 * with the highest non-zero balance as a single-line plaintext string.
	 */
	private async _getRecord(program: string, includePlaintext = false): Promise<string> {
		const records = await this.wallet.requestRecords(program, includePlaintext);
		const unspent = records?.filter(
			(r) => typeof r === "object" && r !== null && "spent" in r && !r.spent,
		);
		if (!unspent?.length) {
			throw new Error(`No unspent ${program} records found`);
		}

		// Decrypt all unspent records in parallel (fast with AutoDecrypt permission)
		const decrypted = await Promise.all(
			unspent.map(async (rec) => {
				if (
					typeof rec !== "object" ||
					rec === null ||
					!("recordCiphertext" in rec) ||
					typeof rec.recordCiphertext !== "string"
				) {
					throw new Error("Invalid record format");
				}
				// console.debug("Decrypting record:", rec);
				const plaintext = await this.wallet.decrypt(rec.recordCiphertext);
				// console.debug("Decrypted plaintext:", plaintext);
				return plaintext.replace(/\s+/g, " ").trim();
			}),
		);

		// Find records with non-zero balance, sorted highest-first
		const withBalance = decrypted
			.map((line) => {
				const match = line.match(/microcredits:\s*(\d+)u64/) || line.match(/amount:\s*(\d+)u\d+/);
				return { line, balance: match ? BigInt(match[1]) : 0n };
			})
			.filter((r) => r.balance > 0n)
			.sort((a, b) => (b.balance > a.balance ? 1 : -1));

		if (!withBalance.length) {
			throw new Error(`No ${program} records with balance found`);
		}

		return withBalance[0].line;
	}

	/**
	 * Build a Sealance Merkle exclusion proof proving the sender is NOT on the
	 * program's freeze list. Required for compliant stablecoin transfers.
	 */
	private async _getComplianceProof(
		stablecoinKey: "usad" | "usdcx",
		senderAddress: string,
	): Promise<string> {
		const { SealanceMerkleTree } = await loadProvableSdk(this.network);
		const sealance = new SealanceMerkleTree();
		const url = NETWORK_CONFIG[this.network].freezeListApi[stablecoinKey];
		const res = await fetch(url);
		const freezeList = await res.json();
		const tree = sealance.convertTreeToBigInt(freezeList);
		const [leftIdx, rightIdx] = sealance.getLeafIndices(tree, senderAddress);
		const leftProof = sealance.getSiblingPath(tree, leftIdx, 16);
		const rightProof = sealance.getSiblingPath(tree, rightIdx, 16);
		return sealance.formatMerkleProof([leftProof, rightProof]);
	}

	/**
	 * Transfer native Aleo credits to the specified recipient.
	 */
	async transferCredit(params: AleoTransferCreditParams): Promise<{ transactionId: string }> {
		const { amount } = params;

		const transferType = params.transferType || "public";
		const privateFee = params?.privateFee || false;
		const fee = toMicroUnits(params.fee || 0.1, 6);

		let recipient: string;
		if (params.recipient) {
			recipient = params.recipient;
		} else {
			const vault = await this.fetchVaultByTokenAddress("credits.aleo");
			if (!vault) {
				throw new Error("Failed to fetch vault address");
			}
			recipient = vault.address;
		}

		const amountInMicroCredits = toMicroUnits(amount, 6, "u64");

		const PROGRAM_NAME = "credits.aleo";

		const functionName = transferType === "public" ? "transfer_public" : "transfer_private";

		let inputs: string[];

		switch (functionName) {
			case "transfer_public":
				inputs = [recipient, amountInMicroCredits];
				break;
			case "transfer_private": {
				const record = await this._getRecord(PROGRAM_NAME);
				inputs = [record, recipient, amountInMicroCredits];
				break;
			}
			default:
				throw new Error("Invalid or Unsupported transfer type");
		}

		const result = await this.wallet.executeTransaction({
			program: PROGRAM_NAME,
			function: functionName,
			inputs,
			fee: Number(fee),
			privateFee,
		});

		return result;
	}

	async transferStableCoin(
		params: AleoTransferStableCoinParams,
	): Promise<{ transactionId: string }> {
		const { amount } = params;
		const transferType = params.transferType || "public";
		const privateFee = params?.privateFee || false;
		const fee = toMicroUnits(params.fee || 0.1, 6);
		const programId = this.sandbox ? `test_${params.programId}` : params.programId;
		const tokenSymbol = params.programId === "usad_stablecoin.aleo" ? "usad" : "usdcx";
		const functionName = transferType === "public" ? "transfer_public" : "transfer_private";

		let recipient: string;
		if (params.recipient) {
			recipient = params.recipient;
		} else {
			const vault = await this.fetchVaultByTokenAddress(params.programId);
			if (!vault) {
				throw new Error("Failed to fetch vault address");
			}
			recipient = vault.address;
		}

		const amountInMicroUnits = toMicroUnits(amount, 6, "u128");

		let inputs: string[];
		switch (functionName) {
			case "transfer_public":
				inputs = [recipient, amountInMicroUnits];
				break;
			case "transfer_private": {
				// For private transfer, we need to find a record with sufficient balance
				const [record, complianceProof] = await Promise.all([
					this._getRecord(programId),
					this._getComplianceProof(tokenSymbol, this.wallet.address),
				]);
				inputs = [recipient, amountInMicroUnits, record, complianceProof];
				break;
			}
			default:
				throw new Error("Invalid or Unsupported transfer type");
		}

		const result = await this.wallet.executeTransaction({
			fee: Number(fee),
			privateFee,
			program: programId,
			function: functionName,
			inputs,
		});

		return result;
	}

	async getPublicBalance(): Promise<string> {
		const balance = await (await this.client()).getPublicBalance(this.wallet.address);
		const formattedAmount = fromMicroUnits(balance);
		return formattedAmount;
	}

	async getPublicTokenBalance(tokenProgramId: string, tokenSymbol: string): Promise<string> {
		const tokenMetadata = await getTokenBySymbol(tokenSymbol, this.sandbox ? "testnet" : "mainnet");
		if (!("decimals" in tokenMetadata)) {
			throw new Error(`Token metadata for ${tokenSymbol} does not include decimals.`);
		}

		const mappingNames = await (await this.client()).getProgramMappingNames(tokenProgramId);

		const balanceMappingName = mappingNames.includes("balances")
			? "balances"
			: mappingNames.includes("account")
				? "account"
				: null;

		if (!balanceMappingName) {
			throw new Error("No public balance mapping found (no 'balances' or 'account').");
		}

		const balance = await (
			await this.client()
		).getProgramMappingValue(tokenProgramId, balanceMappingName, this.wallet.address);

		if (balance) {
			const regex = /(\d+)u\d+/;
			const match = balance.match(regex);

			if (match) {
				const amount = match[1];
				const formattedAmount = fromMicroUnits(amount, tokenMetadata.decimals);
				return formattedAmount;
			} else {
				throw new Error(`Invalid balance format: ${balance}`);
			}
		} else {
			return "0";
		}
	}

	async getPrivateBalance(): Promise<string> {
		const programId = "credits.aleo";
		const records = await this.wallet.requestRecords(programId, false);

		if (!records) {
			throw new Error(`No records found for program ${programId}`);
		}
		// console.log("Fetched Records:", records);
		const unspent = records.filter((r) => r && typeof r === "object" && "spent" in r && !r.spent);

		if (!unspent || !unspent.length) {
			throw new Error(`No unspent ${programId} records found`);
		}

		const decrypted = await Promise.all(
			unspent.map(async (rec) => {
				if (
					!rec ||
					typeof rec !== "object" ||
					!("recordCiphertext" in rec) ||
					typeof rec.recordCiphertext !== "string"
				) {
					throw new Error(`Invalid record format: ${JSON.stringify(rec)}`);
				}
				const plaintext = await this.wallet.decrypt(rec.recordCiphertext);
				return plaintext.replace(/\s+/g, " ").trim();
			}),
		);

		const balance = decrypted
			.map((line) => {
				const match = line.match(/microcredits:\s*(\d+)u64/);
				return match ? BigInt(match[1]) : 0n;
			})
			.reduce((acc, val) => acc + val, 0n);

		return fromMicroUnits(balance, 6);
	}

	async getPrivateTokenBalance(tokenProgramId: string, tokenSymbol: string): Promise<string> {
		const records = await this.wallet.requestRecords(tokenProgramId, false);

		if (!records) {
			throw new Error(`No records found for program ${tokenProgramId}`);
		}

		const unspent = records.filter((r) => r && typeof r === "object" && "spent" in r && !r.spent);

		if (!unspent || !unspent.length) {
			throw new Error(`No unspent ${tokenProgramId} records found`);
		}

		const decrypted = await Promise.all(
			unspent.map(async (rec) => {
				if (
					!rec ||
					typeof rec !== "object" ||
					!("recordCiphertext" in rec) ||
					typeof rec.recordCiphertext !== "string"
				) {
					throw new Error(`Invalid record format: ${JSON.stringify(rec)}`);
				}
				const plaintext = await this.wallet.decrypt(rec.recordCiphertext);
				return plaintext.replace(/\s+/g, " ").trim();
			}),
		);

		const balance = decrypted
			.map((line) => {
				const match = line.match(/amount:\s*(\d+)u\d+/);
				return match ? BigInt(match[1]) : 0n;
			})
			.reduce((acc, val) => acc + val, 0n);

		const tokenMetadata = await getTokenBySymbol(tokenSymbol, this.sandbox ? "testnet" : "mainnet");
		if (!("decimals" in tokenMetadata)) {
			throw new Error(`Token metadata for ${tokenSymbol} does not include decimals.`);
		}

		return fromMicroUnits(balance, tokenMetadata.decimals);
	}
}
