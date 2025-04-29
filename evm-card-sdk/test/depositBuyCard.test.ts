import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: deposit and buycard", () => {
	describe("depositUsdc()", () => {
		it("Should increase user card balance", async () => {
			const amount = "1000";
			const token = await service.usdcToken.getAddress();
			const spender = await service.zebecCard.getAddress();
			const approval = await service.approve({
				amount,
				spender,
				token,
			});
			if (approval) {
				const receipt0 = await approval.wait();
				console.log("approval hash:", receipt0?.hash);
			}
			const cardBalanceBefore = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", cardBalanceBefore);
			const response = await service.depositUsdc({ amount });
			const receipt1 = await response.wait();
			console.log("txhash:", receipt1?.hash);

			const cardBalanceAfter = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", cardBalanceAfter);
		});
	});

	describe("buyCard()", () => {
		it("Should decrease user card balance", async () => {
			console.log("card balance:", await service.getUserBalance({ userAddress: signer }));

			const response = await service.buyCard({
				amount: "199",
				cardType: "silver",
				buyerEmail: "user@gmail.com",
			});
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);

			const cardBalance = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", cardBalance);
		});
	});
});
