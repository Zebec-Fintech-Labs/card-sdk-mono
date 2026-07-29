import { ethers } from "ethers";
import { describe } from "mocha";

import { FeeTier, PartnerConfig, SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);
console.log("signer", signer.address);

const partnerId = ethers.id("velo");
console.log("partnerId:", partnerId);

describe("ZebecCardService: Partner config", () => {
	describe.skip("setPartnerConfig()", () => {
		it("Should set partner config", async () => {
			const cardConfig = await service.getCardConfig();
			const config: PartnerConfig = {
				enabled: true,
				defaultFeePercent: "5",
				cardVault: cardConfig.cardVault,
				revenueVault: cardConfig.revenueVault,
				reloadableFeePercent: "1.0",
				minCardAmount: "5",
				maxCardAmount: "1000",
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
				{ feePercent: "0.5", maxAmount: "1000.0", minAmount: "501.0" },
				{ feePercent: "3", maxAmount: "500.0", minAmount: "101.0" },
				{ feePercent: "6.5", maxAmount: "100.0", minAmount: "5.0" },
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

	describe("setPartnerTokenFee()", () => {
		it("Should set partner token fee", async () => {
			const tokenAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
			const fee = 0;
			const response = await service.setPartnerTokenFee({ partnerId, tokenAddress, fee });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("getPartnerTokenFee()", () => {
		it("Should get partner token fee", async () => {
			const tokenAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
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
