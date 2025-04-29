import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[1];
const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: deposit and withdraw", () => {
	describe("depositUsdc()", () => {
		it("Should increase user card balance", async () => {
			console.log("address:", signer.address);
			const cardBalance0 = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", cardBalance0);
			const amount = "1000";
			const spender = await service.zebecCard.getAddress();
			const token = await service.usdcToken.getAddress();
			const approval = await service.approve({
				token,
				amount,
				spender,
			});
			if (approval) {
				const receipt0 = await approval.wait();
				console.log("approval hash:", receipt0?.hash);
			}

			const response = await service.depositUsdc({ amount });
			const receipt1 = await response.wait();
			console.log("txhash:", receipt1?.hash);

			const cardBalance1 = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", cardBalance1);
		});
	});

	describe("withdraw()", () => {
		it("Should decrease user card balance", async () => {
			const response = await service.withdraw({ amount: "10" });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);

			const userBalance = await service.getUserBalance({ userAddress: signer });
			console.log("card balance:", userBalance);
		});
	});
});
