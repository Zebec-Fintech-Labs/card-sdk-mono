import { describe } from "mocha";

import { SupportedChain, SwapAndBuyCardParamsOdyssey, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Odyssey;
const provider = getProvider(chainId);
const signer = getSigners(provider)[1];
const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: swapAndBuyCardDirect", () => {
	describe("swapAndBuyCardDirect() Odyssey", () => {
		it("Should swap and buy on odyssey", async () => {
			const buyerEmail = "shrestharoshan768@gmail.com";
			const swapAmount = "1265";
			console.log("signer: ", signer.address);
			const swapAndBuyParams: SwapAndBuyCardParamsOdyssey = {
				cardType: "silver",
				buyerEmail,
				ether: swapAmount,
				slippage: 1,
			};

			const response = await service.swapAndBuyCardOdyssey(swapAndBuyParams);
			const receipt = await response.wait();
			console.log("hash: ", receipt?.hash);
		});
	});
});
