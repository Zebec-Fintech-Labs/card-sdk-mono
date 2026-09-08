import assert from "assert";
import { describe, it } from "mocha";
import { ethers } from "ethers";

import { ZebecCardService, SupportedChain } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.RobinhoodTestnet;
const provider = getProvider(chainId);
const signers = getSigners(provider);
const signer = signers[0];

const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: getCardConfig", () => {
	describe("getCardConfig()", () => {
		it("Should read card config", async () => {
			const config = await service.getCardConfig();

			console.log("nativeFeePercent: ", config.nativeFeePercent);
			console.log("nonNativeFeePercent: ", config.nonNativeFeePercent);
			console.log("revenueFeePercent: ", config.revenueFeePercent);
			console.log("totalCardSold: ", config.totalCardSold);
			console.log("cardVault: ", config.cardVault);
			console.log("revenueVault: ", config.revenueVault);
			console.log("commissionVault: ", config.commissionVault);
			console.log("usdcAddress: ", config.usdcAddress);
			console.log("minCardAmount: ", config.minCardAmount);
			console.log("maxCardAmount: ", config.maxCardAmount);
			console.log("dailyCardPurchaseLimit: ", config.dailyCardPurchaseLimit);

			assert.notStrictEqual(
				config.cardVault,
				ethers.ZeroAddress,
				"cardVault should not be zero address",
			);
			assert.notStrictEqual(
				config.usdcAddress,
				ethers.ZeroAddress,
				"usdcAddress should not be zero address",
			);
			assert.notStrictEqual(
				config.revenueVault,
				ethers.ZeroAddress,
				"revenueVault should not be zero address",
			);
			assert.notStrictEqual(
				config.commissionVault,
				ethers.ZeroAddress,
				"commissionVault should not be zero address",
			);
		});
	});
});
