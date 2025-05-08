import { describe, it } from "mocha";
import { SubmittableTransaction } from "xrpl";

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
		apiKey: process.env.API_KEY!,
		encryptionKey: process.env.ENCRYPTION_KEY!,
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

	describe("getDecimalsOfCurrency", () => {
		it("getDecimalsOfCurrency", async () => {
			const account = "rBwV8RZ3CTC2bvRvJTo9Yj55njd1woFW1W";
			const currency = "XRH";
			const decimals = await service.getDecimalsOfCurrency(account, currency);
			console.log("decimals:", decimals);

			// assert(response, "Response should not be null");
		});
	});

	describe("getTokenBalances", () => {
		it("getTokenBalances", async () => {
			const account = "rBwV8RZ3CTC2bvRvJTo9Yj55njd1woFW1W";
			const balances = await service.getTokenBalances(account);
			console.log("balances:", JSON.stringify(balances, null, 2));

			// assert(response, "Response should not be null");
		});
	});

	describe("fetchVault", () => {
		it("fetch Vault Address", async () => {
			let vaultAddress = await service.fetchVault("XRP");
			console.log("vaultAddress:", vaultAddress);

			vaultAddress = await service.fetchVault("RLUSD");
			console.log("vaultAddress:", vaultAddress);
			// assert(response, "Response should not be null");
		});
	});
});
