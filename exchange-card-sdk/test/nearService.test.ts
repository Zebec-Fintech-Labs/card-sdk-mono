import { describe } from "mocha";

import { Action, FunctionCall, Transfer } from "@near-js/transactions";

import { NearService, NearWallet } from "../src";
import { getNearAccounts } from "./setup";

const accounts = getNearAccounts();
const account = accounts[0];

const nearWallet: NearWallet = {
	signerId: account.accountId,
	signAndSendTransaction: async (transaction) => {
		const actions = transaction.actions.map((item) => {
			if (item.type === "Transfer") {
				return new Action({ transfer: new Transfer({ deposit: BigInt(item.params.deposit) }) });
			}

			if (item.type === "FunctionCall") {
				return new Action({
					functionCall: new FunctionCall({
						methodName: item.params.methodName,
						args: Buffer.from(JSON.stringify(item.params.args)),
						deposit: BigInt(item.params.deposit),
						gas: BigInt(item.params.gas),
					}),
				});
			}

			throw new Error("Unexpected action type!");
		});

		const signedTransaction = await account.createSignedTransaction(
			transaction.receiverId,
			actions,
		);

		const result = await account.provider.sendTransaction(signedTransaction);

		return result;
	},
};
const service = new NearService(
	nearWallet,
	{
		apiKey: process.env.API_KEY!,
		encryptionKey: process.env.ENCRYPTION_KEY!,
	},
	{
		sandbox: true,
	},
);

describe("NearService", () => {
	it("should transfer native NEAR", async () => {
		const signature = await service.transferNear({
			amount: "0.1",
		});
		console.log("Transfer signature:", signature);
	});

	it("should transfer fungible token", async () => {
		const tokenContractId = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";

		// const registrationSig = await service.registerUserToTokenContract({ tokenContractId });
		// console.log("Registration Signature:", registrationSig);

		const signature = await service.transferTokens({
			amount: "1",
			tokenContractId,
		});
		console.log("Transfer signature:", signature);
	});

	it("should get token balance", async () => {
		const tokenContractId = "usdn.testnet";
		const balance = await service.getTokenBalance({
			tokenContractId,
		});
		console.log("Token balance:", balance);
	});
});
