import BigNumber from "bignumber.js";
import { describe } from "mocha";

import { translateAddress, web3 } from "@coral-xyz/anchor";
import {
	createAssociatedTokenAccountInstruction,
	getAssociatedTokenAddressSync,
	getMintDecimals,
} from "@zebec-network/solana-common";

import { parseQuoteInfo } from "../../../src";
import { JUP_SWAP_API } from "../../../src/constants";
import { getConnection, getProviders } from "../../shared";

describe("swap with different feepayer and swapper", () => {
	const network = "mainnet-beta";
	const connection = getConnection(network);
	const provider = getProviders(network);
	console.log("provider:", provider[2].publicKey.toString());
	console.log("provider:", provider[1].publicKey.toString());

	it("should be possible", async () => {
		const user = provider[1].publicKey;
		const inputAmount = "27";
		const slippagePercent = "0.3";
		const swapMode = "ExactIn";

		const inputMint = translateAddress("UPTx1d24aBWuRgwxVnFmX4gNraj3QGFzL3QqBgxtWQG");
		const outputMint = translateAddress("So11111111111111111111111111111111111111112");

		const inputMintDecimals = await getMintDecimals(connection, inputMint);
		const parsedInputAmount = BigNumber(inputAmount).times(BigNumber(10).pow(inputMintDecimals));

		const slippage = BigNumber(slippagePercent).times(100).toFixed(0, BigNumber.ROUND_DOWN);

		const queryParams = new URLSearchParams({
			inputMint: inputMint.toString(),
			outputMint: outputMint.toString(),
			amount: parsedInputAmount.toFixed(0),
			slippageBps: slippage,
			swapMode: swapMode,
		});
		const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?${queryParams}`);
		const quoteInfojson: unknown = await quoteResponse.json();
		// console.log("quoteResponse:", quoteInfojson);
		const quoteInfo = await parseQuoteInfo(quoteInfojson);
		// get serialized transactions for the swap
		const { swapTransaction } = await (
			await fetch(JUP_SWAP_API, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					// quoteResponse from /quote api
					quoteResponse: quoteInfo,
					// user public key to be used for the swap
					userPublicKey: user.toString(),
					// auto wrap and unwrap SOL. default is true
					wrapAndUnwrapSol: true,
					// feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
					// feeAccount: "fee_account_public_key"
				}),
			})
		).json();

		const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
		const transaction = web3.VersionedTransaction.deserialize(swapTransactionBuf);

		// get address lookup table accounts
		const addressLookupTableAccounts = await Promise.all(
			transaction.message.addressTableLookups.map(async (lookup) => {
				const data = await connection.getAccountInfo(lookup.accountKey).then((res) => res!.data);
				return new web3.AddressLookupTableAccount({
					key: lookup.accountKey,
					state: web3.AddressLookupTableAccount.deserialize(data),
				});
			}),
		);

		// decompile transaction message and add transfer instruction
		let message = web3.TransactionMessage.decompile(transaction.message, {
			addressLookupTableAccounts: addressLookupTableAccounts,
		});

		const ixs = message.instructions;
		// create token account instruction
		ixs.unshift(
			createAssociatedTokenAccountInstruction(
				// fee payer
				provider[2].publicKey,
				// associated token account
				getAssociatedTokenAddressSync(outputMint, provider[1].publicKey),
				// owner
				provider[1].publicKey,
				// mint
				outputMint,
			),
		);

		const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
		message.payerKey = provider[2].publicKey;
		message.recentBlockhash = blockhash;
		message.instructions = ixs;

		const tx = new web3.VersionedTransaction(
			message.compileToV0Message(addressLookupTableAccounts),
		);

		// sign transaction
		const signedTx = await provider[1].wallet.signTransaction(tx);
		const signedTx1 = await provider[2].wallet.signTransaction(signedTx);

		// const simResult = await connection.simulateTransaction(signedTx1, { commitment: "confirmed" });
		// console.log("simResult:", simResult.value);
		const signature = await connection.sendRawTransaction(signedTx1.serialize());

		console.log("signature:", signature);

		await connection.confirmTransaction({
			signature: signature,
			blockhash,
			lastValidBlockHeight,
		});
	});
});
