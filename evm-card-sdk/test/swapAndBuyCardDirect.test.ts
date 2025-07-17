import assert from "assert";
import { describe } from "mocha";

import { SupportedChain, USDC_ADDRESS, ZebecCardService } from "../src";
import { fetchSwapData, getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Base;
const provider = getProvider(chainId);
const signers = getSigners(provider);
const signer = signers[2];
console.log(
	"signers:",
	signers.map((s) => s.address),
);
const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: swapAndBuyCardDirect", () => {
	describe("swapAndBuyCardDirect()", () => {
		it("Should transfer balance from user's wallet to revenue vault", async () => {
			// const brett = "0x532f27101965dd16442E59d40670FaF5eBB142E4";
			const mgames = "0xD92B53EF83afAf0d0A0167cF7aC5951AD1994824";
			const amount = "1862.095959";
			const spender = await service.zebecCard.getAddress();
			// const WETH = "0x4200000000000000000000000000000000000006";

			const params = {
				amount,
				chainId: chainId,
				dst: USDC_ADDRESS[chainId],
				src: mgames,
				from: spender,
				origin: spender,
				receiver: spender,
				slippage: 0.5,
			};

			const data = await fetchSwapData(params);
			console.log(data);

			assert(!("error" in data), "Error in swap data response");
			console.log("spender:", spender);

			// Get current gas price and estimate ga

			const approval1 = await service.approve({
				amount,
				spender,
				token: mgames,
			});

			if (approval1) {
				const receipt1 = await approval1.wait();
				console.log("approval hash:", receipt1?.hash);
			}

			const response = await service.swapAndBuyCardDirect({
				cardType: "silver",
				buyerEmail: "user@gmail.com",
				swapData: data,
			});
			const receipt2 = await response.wait();
			console.log("swap and buycard hash:", receipt2?.hash);
		});
	});
});
