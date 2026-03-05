import {
	type Account,
	AleoKeyProvider,
	AleoNetworkClient,
	initThreadPool,
	ProgramManager,
} from "@provablehq/sdk/testnet.js";

import { ALEO_NETWORK_CLIENT_URL, AleoService, type AleoWallet, getTokenBySymbol } from "../src";
import { getAleoAccounts } from "./setup";

const accounts = getAleoAccounts("testnet");
const account = accounts[0];
console.log("address", account.toString());
const client = new AleoNetworkClient(ALEO_NETWORK_CLIENT_URL);
client.setAccount(account as Account);
const keyProvider = new AleoKeyProvider();
const programManager = new ProgramManager(ALEO_NETWORK_CLIENT_URL, keyProvider);

const wallet: AleoWallet = {
	address: account.toString(),
	decrypt: async (cipherText: string) => {
		const decrypted = account.decryptRecord(cipherText).toString();
		console.log("Decrypted record:", decrypted);
		return decrypted;
	},
	requestRecords: async (program: string, _includePlaintext?: boolean) => {
		// For testing purposes, we fetch records from the last 10,000 blocks. In a production environment, you would want to implement a more robust solution for fetching records;
		const latestHeight = await client.getLatestHeight();
		const records = await client.findUnspentRecords(latestHeight - 10000, latestHeight, [program]);
		console.log(`Fetched records`, records);
		return records;
	},
	executeTransaction: async (transaction) => {
		console.log("transaction:", JSON.stringify(transaction, null, 2));

		const tx = await programManager.buildExecutionTransaction({
			functionName: transaction.function,
			inputs: transaction.inputs,
			priorityFee: transaction.fee || 0.1,
			privateFee: transaction.privateFee || false,
			programName: transaction.program,
			privateKey: account.privateKey(),
			keySearchParams: {
				cacheKey: `${transaction.program}:${transaction.function}`,
			},
		});

		const result = await client.submitTransaction(tx);
		return { transactionId: result };
	},
};

const service = new AleoService(wallet, { sandbox: true });

describe("AleoService", () => {
	it("should get aleo balance", async () => {
		const balance = await service.getPublicBalance();
		console.log("Balance:", balance);
	});

	it("should get token balance", async () => {
		const balance = await service.getPublicTokenBalance("test_usdcx_stablecoin.aleo", "USDCx");
		console.log("USDC Balance:", balance);
	});

	it("should transfer native credit", async () => {
		const result = await service.transferCredit({
			amount: 0.01,
			privateFee: false,
			transferType: "private",
		});
		console.log("Transfer transaction Id:", result.transactionId);
	});

	it("should transfer stable coin", async () => {
		const result = await service.transferStableCoin({
			programId: "usad_stablecoin.aleo",
			amount: 0.01,
			privateFee: false,
			transferType: "private",
		});
		console.log("Transfer transaction Id:", result.transactionId);
	});

	it("should fetch private native balance", async () => {
		const balance = await service.getPrivateBalance();
		console.log("Private Balance:", balance);
	});

	it("should fetch token metadata", async () => {
		const metadata = await getTokenBySymbol("usad", "mainnet");
		console.log("Token Metadata:", metadata);
	});
});

describe("Aleo Transaction Parsing", () => {
	it("should parse transfer credit transaction", async () => {
		initThreadPool();

		const receiver = accounts[1] as Account;
		console.log("receiver address", receiver.toString());
		const txId = "at1xr52jse7t5zqg6fmzkclh256pndlmywyvcdjj7q00sarxtz92gpqt9w5f6";

		// fetch transaction details using AleoNetworkClient
		const transaction = await client.getTransaction(txId);

		// fetch transaction

		console.log("Parsed transaction:", JSON.stringify(transaction, null, 2));
	});
});
