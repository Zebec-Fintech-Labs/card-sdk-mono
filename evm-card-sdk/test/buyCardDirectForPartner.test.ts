import { ethers } from "ethers";
import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);
console.log("signer", signer.address);

const partnerId = ethers.id("velo");
console.log("partnerId:", partnerId);

describe("ZebecCardService: buyCardDirectForPartner", () => {
	describe("buyCardDirectForPartner()", () => {
		it("Should transfer balance from user's wallet for partner card purchase", async () => {
			const amount = "10";
			console.log("amount:", amount);

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

			const response = await service.buyCardDirectForPartner({
				partnerId,
				amount,
				cardType: "silver",
				buyerEmail: "user@gmail.com",
			});

			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});
});
