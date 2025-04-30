import assert from "assert";
import { describe, it } from "mocha";

import { getBuyCardMemoFromParsedTransaction, hashSHA256, web3 } from "../../../src";
import { getConnection } from "../../shared";

describe("getBuyCardMemoFromParsedTransaction", () => {
	const network = "devnet";
	const connection = getConnection(network);

	it("get memo passed during card purchase", async () => {
		const buyer = await hashSHA256("abc@gmail.com");

		const signature =
			"2MNwzSozzPmip47VeAoJgCqT5hiw7ZzUxeUcP9FqQZZA9SyTxu6Xw8fbX9p5N5Se1LqWt5PFAJmRWAu5274VAv7q";

		const transactionWithMeta = await connection.getParsedTransaction(signature, {
			maxSupportedTransactionVersion: 0,
			commitment: "finalized",
		});

		// throw error if null
		assert(transactionWithMeta);

		const memo = getBuyCardMemoFromParsedTransaction(transactionWithMeta.transaction);

		console.log("buyerHash", buyer, memo.buyer);
		assert(buyer === memo.buyer);
	});

	it.only("print public key", () => {
		console.log(
			"usdc",
			new web3.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v").toBytes(),
		);

		console.log(
			"wsol",
			new web3.PublicKey([
				6, 155, 136, 87, 254, 171, 129, 132, 251, 104, 127, 99, 70, 24, 192, 53, 218, 196, 57, 220,
				26, 235, 59, 85, 152, 160, 240, 0, 0, 0, 0, 1,
			]).toString(),
		);
	});
});
