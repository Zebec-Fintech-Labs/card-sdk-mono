import { AleoKeyProvider, AleoNetworkClient, ProgramManager } from "@provablehq/sdk";

import { ALEO_NETWORK_CLIENT_URL, AleoService, type AleoWallet, getTokenBySymbol } from "../src";
import { getAleoAccount } from "./setup";

const account = getAleoAccount("testnet");
console.log("address", account.toString());
const client = new AleoNetworkClient(ALEO_NETWORK_CLIENT_URL);
const keyProvider = new AleoKeyProvider();
const programManager = new ProgramManager(ALEO_NETWORK_CLIENT_URL, keyProvider);

const wallet: AleoWallet = {
	address: account.toString(),
	decrypt: async (cipherText: string) => {
		return account.decryptRecord(cipherText).toString();
	},
	requestRecords: async (_program: string, _includePlaintext?: boolean) => {
		throw new Error("Method not implemented.");
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
		const balance = await service.getPublicBalance(account.toString());
		console.log("Balance:", balance);
	});

	it("should get token balance", async () => {
		const balance = await service.getPublicTokenBalance(
			account.toString(),
			"test_usdcx_stablecoin.aleo",
			"USDCx",
		);
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

	it("should fetch token metadata", async () => {
		const metadata = await getTokenBySymbol("usad", "mainnet");
		console.log("Token Metadata:", metadata);
	});
});
