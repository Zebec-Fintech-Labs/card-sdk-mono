import algosdk from "algosdk";

import { ClientManager } from "@algorandfoundation/algokit-utils/types/client-manager";

import { AlgorandService, AlgorandWallet } from "../src";
import { getAlgorandAccount } from "./setup";

const algodClient = ClientManager.getAlgodClient(
	ClientManager.getAlgoNodeConfig("testnet", "algod"),
);

const senderAccount = getAlgorandAccount();

console.log("Sender Account:", senderAccount.addr.toString());
const algorandWallet: AlgorandWallet = {
	address: senderAccount.addr.toString(),
	signAndSendTransaction: async (txn) => {
		const signedTxn = txn.signTxn(senderAccount.sk);

		// Submit the transaction
		const txResponse = await algodClient.sendRawTransaction(signedTxn).do();

		// Wait for confirmation
		await algosdk.waitForConfirmation(
			algodClient,
			txResponse.txid,
			4, // Wait for 4 rounds
		);

		return txResponse.txid;
	},
};

const service = new AlgorandService(algorandWallet, {
	sandbox: true,
});

describe("AlgorandService", () => {
	it("should transfer native ALGO", async () => {
		const signature = await service.transferAlgo({
			amount: 0.1,
		});
		console.log("Transfer signature:", signature);
	});

	it("should transfer algorand asset", async () => {
		const signature = await service.transferAsset({
			amount: 1,
			assetId: 742985154,
		});
		console.log("Transfer signature:", signature);
	});

	it("should get token balance", async () => {
		const balance = await service.getAccountBalance(algorandWallet.address);
		console.log("Balance:", balance);
	});
});

describe("create asset transaction", () => {
	it("should create assset", async () => {
		const config = {
			assetName: "Test USDC Coin",
			unitName: "TUC",
			total: 1_000_000_000_000n,
			decimals: 6,
			defaultFrozen: false,
			url: "https://myteststablecoin.com",
		};

		// Get suggested transaction parameters
		const suggestedParams = await algodClient.getTransactionParams().do();

		// Create asset creation transaction
		const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
			sender: senderAccount.addr,
			total: config.total,
			decimals: config.decimals,
			assetName: config.assetName,
			unitName: config.unitName,
			assetURL: config.url,
			assetMetadataHash: undefined,
			manager: senderAccount.addr,
			reserve: senderAccount.addr,
			freeze: senderAccount.addr,
			clawback: senderAccount.addr,
			defaultFrozen: config.defaultFrozen,
			suggestedParams: suggestedParams,
		});

		const signedTxn = assetCreateTxn.signTxn(senderAccount.sk);

		// Submit the transaction
		const txResponse = await algodClient.sendRawTransaction(signedTxn).do();

		// Wait for confirmation
		const confirmedTxn = await algosdk.waitForConfirmation(
			algodClient,
			txResponse.txid,
			4, // Wait for 4 rounds
		);

		console.log("txId:", txResponse.txid);
		console.log("assetId:", confirmedTxn.assetIndex);
		console.log("confirmedTxn:", confirmedTxn);
	});
});
