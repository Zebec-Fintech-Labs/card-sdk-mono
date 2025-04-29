import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);
console.log("signer:", signer.address);

describe("ZebecCardService: fetch user balance", () => {
	describe("getUserBalance()", () => {
		it("Should increase user card balance", async () => {
			const cardBalance0 = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", cardBalance0);
		});
	});
});
