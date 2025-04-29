import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);
console.log("signer", signer.address);

describe("ZebecCardService:Admin functions", () => {
	describe("getCustomFee()", () => {
		it("Should get custom fee", async () => {
			const tokenAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
			const customFee = await service.getCustomFee({ tokenAddress });
			console.log("customFee:", customFee);
		});
	});

	describe("setCustomFee()", () => {
		it("Should set Custom fee", async () => {
			const tokenAddress = "";
			const fee = 0.5;
			const response = await service.setCustomFee({ tokenAddress, fee });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});
});
