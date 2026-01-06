import assert from "assert";
import { describe, it } from "mocha";
import { Client, Payment, SubmittableTransaction, TxResponse } from "xrpl";

import { XRPLService } from "../src";
import { getXRPLWallet } from "./setup";

const wallet = getXRPLWallet();
console.log("wallet:", wallet.address);
const service = new XRPLService(
	{
		address: wallet.address,
		signTransaction: async (transaction) => {
			return wallet.sign(transaction as SubmittableTransaction).tx_blob;
		},
	},
	{
		sandbox: false,
	},
);

describe("XRPL Service", () => {
	describe("transferXRP", () => {
		it("transferXRP", async () => {
			const params = {
				walletAddress: wallet.address,
				amount: "1",
			};

			const response = await service.transferXRP(params);
			console.log("response:", JSON.stringify(response, null, 2));
			// assert(response, "Response should not be null");
		});
	});

	describe("transferRLUSD", () => {
		it("transferRLUSD", async () => {
			const params = {
				amount: "0.1",
				token: {
					currency: "524C555344000000000000000000000000000000", // RLUSD
					issuer: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV", // RLUSD issuer
				},
				walletAddress: wallet.address,
			};

			// const response = await service.createTrustLine(params);
			// console.log("response:", JSON.stringify(response, null, 2));

			const response1 = await service.transferTokens(params);
			console.log("response:", JSON.stringify(response1, null, 2));
			// assert(response, "Response should not be null");
		});
	});

	describe("getTokenBalances", () => {
		it("getTokenBalances", async () => {
			const account = wallet.address;
			const balances = await service.getTokenBalances(account);
			console.log("balances:", JSON.stringify(balances, null, 2));

			// assert(response, "Response should not be null");
		});
	});

	describe("fetchVault", () => {
		it("fetch Vault Address", async () => {
			let vaultAddress = await service.fetchVault("XRP");
			console.log("XRP vaultAddress:", vaultAddress);

			vaultAddress = await service.fetchVault("RLUSD");
			console.log("RLUSD vaultAddress:", vaultAddress);
			// assert(response, "Response should not be null");
		});
	});

	describe("fetch xrpl transaction", () => {
		it("fetch transaction", async () => {
			const client = new Client("wss://s.altnet.rippletest.net:51233");

			await client.connect();

			try {
				const tx: TxResponse = await client.request({
					command: "tx",
					transaction: "D5C3D63A8A2D04B82B3CAB26CBBFE49EA16D1FF17A31B2824BF32884F464D35C",
				});
				const transaction = tx.result.tx_json as Payment;
				console.log("Transaction:", JSON.stringify(transaction, null, 2));

				assert("DeliverMax" in transaction, "Transaction should have DeliverMax");

				const destination = transaction.Destination;
				const account = transaction.Account;
				const amount = transaction.DeliverMax;

				console.log("account:", account);
				console.log("destination:", destination);
				console.log("amount:", amount);
			} catch (error) {
				throw error;
			} finally {
				await client.disconnect();
			}
		});
	});
});
