import { describe } from "mocha";

import { ATOKEN_ADDRESS, SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[1];
const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: yield and withdraw", () => {
	describe("generateYield()", () => {
		it("Should deposit to yield provider and decreas users balance", async () => {
			console.log("address:", signer.address);
			const cardBalance0 = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", cardBalance0);
			const amount = "100";

			const response = await service.generateYield({ amount });
			const receipt1 = await response.wait();
			console.log("txhash:", receipt1?.hash);

			const cardBalance1 = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", cardBalance1);
		});
	});

	describe("withdrawYield()", () => {
		it("Should deposit to yield provider and decreas users balance", async () => {
			const spender = await service.zebecCard.getAddress();
			const token = ATOKEN_ADDRESS[chainId];
			console.log({ token });
			const amount = "100";

			const approval = await service.approve({
				token,
				amount,
				spender,
			});
			if (approval) {
				const receipt0 = await approval.wait();
				console.log("approval hash:", receipt0?.hash);
			}

			const response = await service.withdrawYield({ amount });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);

			const userBalance = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", userBalance);
		});
	});
});
