import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[1];
const service = new ZebecCardService(signer, chainId);
console.log("signer:", signer.address);

describe("ZebecCardService: card purchase ", () => {
	describe("getCardPurhcaseOfDay()", () => {
		it("Should increase user card balance", async () => {
			const cardPurchase = await service.getCardPurhcaseOfDay({ userAddress: signer });
			console.log("card purchase:", cardPurchase);
		});
	});
});
