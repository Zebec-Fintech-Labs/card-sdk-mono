import { ethers } from "ethers";
import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.BscTestnet;
const provider = getProvider(chainId);

const signers = getSigners(provider);
console.log(
	"signer ==>",
	signers.map((s) => s.address),
);
const signer = signers[1];

const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: buycardDirect", () => {
	describe("buyCardDirect()", () => {
		it("Should transfer balance from user's wallet to revenue vault for card purchase", async () => {
			console.log(
				"user balance: ",
				ethers.formatEther((await signer.provider?.getBalance(signer.address)) || 0n),
			);
			console.log("token balance:", await service.usdcToken.balanceOf(signer));

			const amount = "10";
			const token = await service.usdcToken.getAddress();
			const spender = await service.zebecCard.getAddress();
			console.log("amount: ", amount);
			console.log("token:", token);

			console.log("token balance:", await service.usdcToken.balanceOf(signer));

			const approval = await service.approve({
				amount,
				spender,
				token,
			});

			if (approval) {
				const receipt0 = await approval.wait();
				console.log("approval hash:", receipt0?.hash);
			}

			const response = await service.buyCardDirect({
				amount,
				cardType: "carbon",
				buyerEmail: "user@gmail.com",
			});

			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});
});
