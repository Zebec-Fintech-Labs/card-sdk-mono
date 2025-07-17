import { describe, it } from "mocha";

import { StellarService, StellarWallet } from "../src";
import { getStellarSigner } from "./setup";

const signer = getStellarSigner();
const wallet: StellarWallet = {
	address: signer.publicKey(),
	signTransaction: async (transaction) => {
		console.log("transaction:", transaction);
		const signedTransaction = signer.sign(Buffer.from(transaction, "base64"));
		return signedTransaction.toString("base64");
	},
};
const apiKey = process.env.API_KEY!;
const encryptionKey = process.env.ENCRYPTION_KEY!;
const service = new StellarService(
	wallet,
	{
		apiKey: apiKey,
		encryptionKey: encryptionKey,
	},
	{
		sandbox: true, // Set true for testing and dev environment
	},
);

describe("purchaseCard()", () => {
	it("fetch quotes", async () => {
		const quote = await service.fetchQuote();
		console.log("Quote:", quote);
	});

	it("should successfully ", async () => {
		console.log("Signer Public Key:", signer.publicKey());

		const amount = "1";

		// const quote = await service.fetchQuote();
		// console.log("Quote:", quote);
		try {
			const tx_hash = await service.transferXLM(amount);
			console.log("Deposit Response:", tx_hash);
		} catch (e: any) {
			// console.log("e:", e);
			console.log("data ==>", e.response);
			console.log("extras ==>", e.response.data.extras.result_codes);
			// throw e;
		}
	});
});
