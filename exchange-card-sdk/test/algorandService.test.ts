import algosdk from "algosdk";

import { ClientManager } from "@algorandfoundation/algokit-utils/types/client-manager";

import { AlgorandService, AlgorandWallet } from "../src";
import { getAlgorandAccount } from "./setup";

const senderAccount = getAlgorandAccount();

console.log("Sender Account:", senderAccount.addr.toString());
const algorandWallet: AlgorandWallet = {
	address: senderAccount.addr.toString(),
	signAndSendTransaction: async (txn) => {
		const signedTxn = txn.signTxn(senderAccount.sk);

		const algodClient = ClientManager.getAlgodClient(
			ClientManager.getAlgoNodeConfig("testnet", "algod"),
		);
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

const service = new AlgorandService(
	algorandWallet,
	{
		apiKey: process.env.API_KEY!,
		encryptionKey: process.env.ENCRYPTION_KEY!,
	},
	{
		sandbox: true,
	},
);

describe("AlgorandService", () => {
	it("should transfer native ALGO", async () => {
		const signature = await service.transferAlgo({
			amount: 0.1,
		});
		console.log("Transfer signature:", signature);
	});

	it("should get token balance", async () => {
		const balance = await service.getAccountBalance(algorandWallet.address);
		console.log("Balance:", balance);
	});
});
