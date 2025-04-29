import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[1];
const service = new ZebecCardService(signer, chainId);
console.log("signer:", signer.address);

describe("ZebecCardService: fetch user balance", () => {
	describe("wrapEth()", () => {
		it("Should increase user card balance", async () => {
			const amount = "0.001";
			const response = await service.wrapEth({ amount });
			const receipt = await response.wait();
			console.log("txHash:", receipt?.hash);
		});
	});
});
