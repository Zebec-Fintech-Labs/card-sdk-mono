import {
	AleoKeyProvider,
	AleoNetworkClient,
	ProgramManager,
} from "@provablehq/sdk";

import {
	ALEO_NETWORK_CLIENT_URL,
	AleoService,
	type AleoWallet,
} from "../src";
import { getAleoAccount } from "./setup";

const account = getAleoAccount("testnet");
console.log("address", account.toString());
const client = new AleoNetworkClient(ALEO_NETWORK_CLIENT_URL);
const keyProvider = new AleoKeyProvider();
const programManager = new ProgramManager(ALEO_NETWORK_CLIENT_URL, keyProvider);

const wallet: AleoWallet = {
	address: account.toString(),
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
		const balance = await service.getBalance(account.toString());
		console.log("Balance:", balance);
	});

	it("should get token balance", async () => {
		const balance = await service.getTokenBalance(
			account.toString(),
			"test_usdcx_stablecoin.aleo",
			"USDCx",
		);
		console.log("USDC Balance:", balance);
	});

	it("should transfer native credit", async () => {
		const result = await service.transferCredits({
			amount: 0.01,
			privateFee: false,
			transferType: "public",
		});
		console.log("Transfer transaction Id:", result.transactionId);
	});
});
