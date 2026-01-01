import { describe } from "mocha";

import { QuaiService, QuaiWallet } from "../src";
import { getQuaiProvider, getQuaiSigners } from "./setup";

const provider = getQuaiProvider();
const signers = getQuaiSigners(provider);
const signer = signers[0];
console.log("signer:", signer.address);
console.log("other signer:", signers[1].address);

const quaiWallet: QuaiWallet = {
	address: signer.address,
	signAndSendTransaction: async (tx) => {
		const response = await signer.sendTransaction(tx);
		await response.wait();

		return response.hash;
	},
};

const service = new QuaiService(quaiWallet, {
	sandbox: true,
});

describe("QuaiService Tests", () => {
	it("should transfer quai", async () => {
		const hash = await service.transferQuai({
			amount: 0.1,
		});

		console.log("Quai Transfer Receipt:", hash);
	});
});
