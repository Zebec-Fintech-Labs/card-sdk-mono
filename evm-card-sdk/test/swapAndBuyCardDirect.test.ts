import { describe } from "mocha";

import { SupportedChain, USDC_ADDRESS, ZebecCardService } from "../src";
import { fetchSwapData, getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Bsc;
const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: swapAndBuyCardDirect", () => {
	describe("swapAndBuyCardDirect()", () => {
		it("Should transfer balance from user's wallet to revenue vault", async () => {
			const brett = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
			const amount = "1";
			const spender = await service.zebecCard.getAddress();
			// const WETH = "0x4200000000000000000000000000000000000006";

			const params = {
				amount,
				chainId: chainId,
				dst: USDC_ADDRESS[chainId],
				src: brett,
				from: spender,
				origin: spender,
				receiver: spender,
				slippage: 0.5,
			};

			const data = await fetchSwapData(params);

			console.log(data);

			const approval1 = await service.approve({
				amount,
				spender,
				token: brett,
			});

			if (approval1) {
				const receipt1 = await approval1.wait();
				console.log("approval hash:", receipt1?.hash);
			}

			const response = await service.swapAndBuyCardDirect({
				...data,
				cardType: "silver",
				buyerEmail: "user@gmail.com",
			});
			const receipt2 = await response.wait();
			console.log("swap and buycard hash:", receipt2?.hash);
		});
	});
});
