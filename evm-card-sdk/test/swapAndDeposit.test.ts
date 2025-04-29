import { describe } from "mocha";

import { SupportedChain, USDC_ADDRESS, ZebecCardService } from "../src";
import { fetchSwapData, getProvider, getSigners, ONE_INCH_ROUTER_V6_ADDRESS } from "./shared";

const chainId = SupportedChain.Mainnet;
const provider = getProvider(chainId);
const signer = getSigners(provider)[2];
// const baseChainId = 8453;
const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: swap and deposit", () => {
	describe("swapAndDeposit()", () => {
		it("Should transfer usdc to contract", async () => {
			// const authToken = process.env.ONE_INCH_AUTH_TOKEN!;
			// assert(authToken && authToken !== "", "missing env var ONE_INCH_AUTH_TOKEN");
			const brett = "0x532f27101965dd16442E59d40670FaF5eBB142E4";
			const amount = "1";
			const WETH = "0x4200000000000000000000000000000000000006";

			const approval = await service.approve({
				token: brett,
				amount,
				spender: ONE_INCH_ROUTER_V6_ADDRESS,
			});

			if (approval) {
				const receipt = await approval.wait();
				console.log("approval hash:", receipt?.hash);
			}

			const data = await fetchSwapData({
				amount,
				chainId: chainId,
				dst: USDC_ADDRESS[chainId],
				src: brett,
				from: signer.address,
				origin: signer.address,
				receiver: signer.address,
				slippage: 0.5,
			});

			console.log({ data });

			const approval1 = await service.approve({
				token: brett,
				amount,
				spender: service.zebecCard,
			});

			if (approval1) {
				const receipt1 = await approval1.wait();
				console.log("approval hash:", receipt1?.hash);
			}

			console.log("card balance:", await service.getUserBalance({ userAddress: signer }));

			const response = await service.swapAndDeposit(data);
			const receipt1 = await response.wait();
			console.log("swap and deposit hash:", receipt1?.hash);

			console.log("card balance:", await service.getUserBalance({ userAddress: signer }));
		});
	});

	describe("fetchSwapData()", () => {
		it("fetch swap quotes data", async () => {
			const amount = "1";
			// const brett = "0x532f27101965dd16442E59d40670FaF5eBB142E4";
			const spectreai = "0x9Cf0ED013e67DB12cA3AF8e7506fE401aA14dAd6";

			const approval = await service.approve({
				token: spectreai,
				amount,
				spender: ONE_INCH_ROUTER_V6_ADDRESS,
			});

			if (approval) {
				const receipt = await approval.wait();
				console.log("approval hash:", receipt?.hash);
			}

			const data = await fetchSwapData({
				amount,
				chainId: chainId,
				dst: USDC_ADDRESS[chainId],
				src: spectreai,
				from: signer.address,
				origin: signer.address,
				receiver: signer.address,
				slippage: 5,
			});

			console.log({ data });
		});
	});

	// describe("withdraw()", () => {
	// 	it("Should withdraw usdc to user", async () => {
	// 		const response = await service.withdraw({ amount: "5.0" });
	// 		const receipt = await response.wait();
	// 		console.log("txhash:", receipt?.hash);

	// 		const cardBalance = await service.getCardBalance({ userAddress: signer });
	// 		console.log("card balance:", cardBalance);
	// 	});
	// });
});
