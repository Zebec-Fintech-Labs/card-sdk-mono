import { type Account, AleoNetworkClient, initThreadPool } from "@provablehq/sdk/testnet.js";

import { describe, it } from "mocha";

import { ALEO_NETWORK_CLIENT_URL, AleoService, getTokenBySymbol } from "../src";
import { createAleoWallet, getAleoAccounts } from "./setup";

const accounts = getAleoAccounts();
const account = accounts[1];
console.log("address", account.toString());
const networkClient = new AleoNetworkClient(ALEO_NETWORK_CLIENT_URL, {
	proverUri: "https://api.provable.com/prove",
	recordScannerUri: "https://api.provable.com/scanner",
});
const wallet = await createAleoWallet(account);
const service = await new AleoService(
	wallet,
	{ host: ALEO_NETWORK_CLIENT_URL },
	{ sandbox: true },
).ready();

initThreadPool();

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
			fee: 0.001,
			transferType: "private",
		});
		console.log("Transfer transaction Id:", result.transactionId);
	});

	it("should transfer stable coin", async () => {
		const result = await service.transferStableCoin({
			programId: "usdcx_stablecoin.aleo",
			amount: 0.01,
			privateFee: false,
			fee: 0.001,
			transferType: "private",
		});
		console.log("Transfer transaction Id:", result.transactionId);
	});

	it("should fetch private native balance", async () => {
		const balance = await service.getPrivateBalance();
		console.log("Private Balance:", balance);
	});

	it("should fetch private token balance", async () => {
		const balance = await service.getPrivateTokenBalance("test_usdcx_stablecoin.aleo", "USDCx");
		console.log("Private USDC Balance:", balance);
	});

	it("should fetch token metadata", async () => {
		const metadata = await getTokenBySymbol("usad", "mainnet");
		console.log("Token Metadata:", metadata);
	});
});

describe("Aleo Transaction Parsing", () => {
	it("should parse transfer credit transaction", async () => {

		const receiver = accounts[1] as Account;
		console.log("receiver address", receiver.toString());
		const txId = "at1xr52jse7t5zqg6fmzkclh256pndlmywyvcdjj7q00sarxtz92gpqt9w5f6";

		// fetch transaction details using AleoNetworkClient
		const transaction = await networkClient.getTransaction(txId);

		// fetch transaction
		console.log("Parsed transaction:", JSON.stringify(transaction, null, 2));
	});
});
