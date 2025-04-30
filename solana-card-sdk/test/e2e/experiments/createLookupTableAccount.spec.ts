import { describe } from "mocha";

import { web3 } from "@coral-xyz/anchor";

import { getConnection, getProviders } from "../../shared";

describe("lookup table actions", () => {
	const network = "mainnet-beta";
	const connection = getConnection(network);
	const provider = getProviders(network)[0];
	console.log("provider:", provider.publicKey.toString());

	it("create address lookup table", async () => {
		// use about 0.003 SOL for two txs;

		const slot = await connection.getSlot();
		const [lookupTableInst, lookupTableAddress] = web3.AddressLookupTableProgram.createLookupTable({
			authority: provider.publicKey, // The authority (i.e., the account with permission to modify the lookup table)

			payer: provider.publicKey, // The payer (i.e., the account that will pay for the transaction fees)

			recentSlot: slot - 1, // The recent slot to derive lookup table's address
		});
		console.log("lookup address:", lookupTableAddress.toString());

		const lbh = await connection.getLatestBlockhash();
		const tm = new web3.TransactionMessage({
			instructions: [lookupTableInst],
			payerKey: provider.publicKey,
			recentBlockhash: lbh.blockhash,
		});

		const vtx = new web3.VersionedTransaction(tm.compileToV0Message());
		const signed = await provider.wallet.signTransaction(vtx);

		const sig = await connection.sendRawTransaction(signed.serialize());
		console.log("sig:", sig);

		await connection.confirmTransaction({
			signature: sig,
			blockhash: lbh.blockhash,
			lastValidBlockHeight: lbh.lastValidBlockHeight,
		});
	});

	it("extends address lookup table", async () => {
		const lookupTable = new web3.PublicKey("Dw9K5oGzAsXybijfgKaJG2ka3WT2sfDoL6SnbCH9kWz");

		const addresses = [
			// new PublicKey("HwXuoBWZK17ezuGzCu61cZGXZJMpKxSca8Hy7ykTksx9"), // card config
			// new PublicKey("75UeVz3WhiGU6D6e7ZJv8FKPU3oZghL17fr8j6fLTTzs"), // revenue vault
			// new PublicKey("4McuJXo3ZinL2Jyry1suw4hovnfLaMzDUbfNoBnERhRh"), // revenue vault usdc account
			// new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // usdc
			// new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), // associated token program
			// new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // token program
			// new PublicKey("11111111111111111111111111111111"), // system program
			new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), // memo program
			new web3.PublicKey("9ggPEnR1F2iiZwotCD6XYTGwXNmyn7nmniK7eR1PSi4N"), // token-fee map account
			new web3.PublicKey("HwXuoBWZK17ezuGzCu61cZGXZJMpKxSca8Hy7ykTksx9"), // card vault
			new web3.PublicKey("FMWTu8ogXv5WZiBmaFzxZLkbvcdHAAUfqvgi6MYFdMs4"), // card vault usdc token account
		];

		// Create an instruction to extend a lookup table with the provided addresses

		const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
			payer: provider.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
			authority: provider.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
			lookupTable, // The address of the lookup table to extend
			addresses: addresses, // The addresses to add to the lookup table
		});

		const lbh = await connection.getLatestBlockhash();
		const mesage = new web3.TransactionMessage({
			instructions: [extendInstruction],
			payerKey: provider.publicKey,
			recentBlockhash: lbh.blockhash,
		});

		const vtx = new web3.VersionedTransaction(mesage.compileToV0Message());
		const signedVtx = await provider.wallet.signTransaction(vtx);

		const signature = await connection.sendRawTransaction(signedVtx.serialize());
		console.log("signature", signature);
		await connection.confirmTransaction({
			signature: signature,
			blockhash: lbh.blockhash,
			lastValidBlockHeight: lbh.lastValidBlockHeight,
		});
	});

	it("list lookup table account addresses", async () => {
		const lookupTable = new web3.PublicKey("Dw9K5oGzAsXybijfgKaJG2ka3WT2sfDoL6SnbCH9kWz");

		const lookupTables = await connection.getAddressLookupTable(lookupTable);
		const lookupTableAccount = lookupTables.value!;
		console.log("Lookup table address: [");
		lookupTableAccount.state.addresses.map((a) => console.log("  ", a.toString()));
		console.log("]");
		console.log("authority", lookupTableAccount.state.authority?.toString());
	});
});
