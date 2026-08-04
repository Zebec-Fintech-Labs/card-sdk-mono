import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Mainnet;
const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);
console.log("signer", signer.address);

describe("ZebecCardService:Admin functions", () => {
	describe("getCustomFee()", () => {
		it("Should get custom fee", async () => {
			const tokenAddress = "0x4933A85b5b5466Fbaf179F72D3DE273c287EC2c2";
			const customFee = await service.getCustomFee({ tokenAddress });
			console.log("customFee:", customFee);
		});
	});

	describe("setCustomFee()", () => {
		it("Should set Custom fee", async () => {
			const tokenAddress = "0x4933A85b5b5466Fbaf179F72D3DE273c287EC2c2";
			const fee = 0.0;
			const response = await service.setCustomFee({ tokenAddress, fee });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});
});
