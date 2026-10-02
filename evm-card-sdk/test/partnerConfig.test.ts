import { ethers } from "ethers";
import { describe } from "mocha";

import { FeeTier, PartnerConfig, SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Bsc;
const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);
console.log("signer", signer.address);

const partnerId = ethers.id("orbit");
console.log("partnerId:", partnerId);

describe("ZebecCardService: Partner config", () => {
	describe("setPartnerConfig()", () => {
		it("Should set partner config", async () => {
			const cardConfig = await service.getCardConfig();
			const config: PartnerConfig = {
				enabled: true,
				defaultFeePercent: "5",
				cardVault: cardConfig.cardVault,
				revenueVault: cardConfig.revenueVault,
				reloadableFeePercent: "0",
				minCardAmount: "10",
				maxCardAmount: "1500",
			};

			const response = await service.setPartnerConfig({ partnerId, config });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("getPartnerConfig()", () => {
		it("Should get partner config", async () => {
			const config = await service.getPartnerConfig({ partnerId });
			console.log("partnerConfig:", config);
		});
	});

	describe("setPartnerEnabled()", () => {
		it("Should enable partner", async () => {
			const response = await service.setPartnerEnabled({ partnerId, enabled: true });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setPartnerFeeTiers()", () => {
		it("Should set partner fee tiers", async () => {
			const feeTiers: FeeTier[] = [
				{ feePercent: "0.5", maxAmount: "1500.0", minAmount: "500.0" },
				{ feePercent: "3", maxAmount: "500.0", minAmount: "100.0" },
				{ feePercent: "6.5", maxAmount: "100.0", minAmount: "10.0" },
			];

			const response = await service.setPartnerFeeTiers({ partnerId, feeTiers });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("getPartnerFeeTiers()", () => {
		it("Should get partner fee tiers", async () => {
			const feeTiers = await service.getPartnerFeeTiers({ partnerId });
			console.log("partnerFeeTiers:", feeTiers);
		});
	});

	describe.only("setPartnerTokenFee()", () => {
		it.only("Should set partner token fee", async () => {
			const tokenAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
			const fee = 0;
			const response = await service.setPartnerTokenFee({ partnerId, tokenAddress, fee });
			console.log("txhash:", response.toJSON());
		});
	});

	describe("getPartnerTokenFee()", () => {
		it("Should get partner token fee", async () => {
			const tokenAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
			const fee = await service.getPartnerTokenFee({ partnerId, tokenAddress });
			console.log("partnerTokenFee:", fee);
		});
	});

	describe("getPartnerFee()", () => {
		it("Should get partner fee for amount", async () => {
			const fee = await service.getPartnerFee({ partnerId, amount: "100" });
			console.log("partnerFee:", fee);
		});
	});
});
