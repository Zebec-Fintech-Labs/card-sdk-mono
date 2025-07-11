import { describe } from "mocha";

import { FeeTier, SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;

const provider = getProvider(chainId);
const signer = getSigners(provider)[0];
const service = new ZebecCardService(signer, chainId);
console.log("signer", signer.address);

describe("ZebecCardService:Admin functions", () => {
	describe("setNativeFee()", () => {
		it("Should update native fee", async () => {
			const response = await service.setNativeFee({ feeInPercent: "1.5" });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setNonNativeFee()", () => {
		it("Should update non native fee", async () => {
			const response = await service.setNonNativeFee({ feeInPercent: "2.5" });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setRevenueFee()", () => {
		it("Should update revenue fee", async () => {
			const response = await service.setRevenueFee({ feeInPercent: "5.0" });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setRevenueVault()", () => {
		it("Should update revenue vault", async () => {
			const vaultAddress = "0x5d00f4cde0EB3760176Ed3C26a7e155183232C3d";
			const response = await service.setRevenueVault({ vaultAddress });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setCommissionVault()", () => {
		it("Should update commission vault", async () => {
			const vaultAddress = "0x71d184Bd15DE33C8A17918D3Eb2337dB9bf337B4";
			const response = await service.setCommissionVault({ vaultAddress });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setCardVault()", () => {
		it("Should update card vault", async () => {
			const vaultAddress = "0xDeb5fDF3ec8428D776e9b637eCd30f1c8ef10efD";
			const response = await service.setCardVault({ vaultAddress });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setUsdcAddress()", () => {
		it("Should update card vault", async () => {
			const tokenAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
			const response = await service.setUsdcAddress({ tokenAddress });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setMinCardAmount()", () => {
		it("Should update min card amount", async () => {
			const minCardAmount = "10";
			const response = await service.setMinCardAmount({ minCardAmount });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setMaxCardAmount()", () => {
		it("Should update min card amount", async () => {
			const maxCardAmount = "1000";
			const response = await service.setMaxCardAmount({ maxCardAmount });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("dailyCardPurchaseLimit()", () => {
		it("Should update dailyCardPurchaseLimit", async () => {
			const dailyCardPurchaseLimit = "1000";
			const response = await service.setDailyCardPurchaseLimit({ dailyCardPurchaseLimit });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setFeeTiers()", () => {
		it("Should update fee tier", async () => {
			const feeTiers: FeeTier[] = [
				{ feePercent: "0.5", maxAmount: "1000.0", minAmount: "501.0" },
				{ feePercent: "3", maxAmount: "500.0", minAmount: "101.0" },
				{ feePercent: "6.5", maxAmount: "100.0", minAmount: "5.0" },
			];
			const response = await service.setFeeTiers({ feeTiers });
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("setFee()", () => {
		it("Should update fee", async () => {
			const response = await service.setFee({
				minAmount: "101",
				maxAmount: "500",
				feePercent: "3.0",
			});
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});

	describe("getCardConfig()", () => {
		it("retreive card configs", async () => {
			const cardConfig = await service.getCardConfig();
			console.log(await service.usdcToken.getAddress());
			console.log("cardConfig:", cardConfig);
		});
	});

	describe("getFeeTiers()", () => {
		it("Shows fee Tiers", async () => {
			const feeTiers = await service.getFeeTiers();
			console.log("feeTiers", feeTiers);
		});
	});

	describe("getAdmin()", () => {
		it("retreive admin address", async () => {
			const admin = await service.getAdmin();
			console.log("admin:", admin);
		});
	});

	describe("getReloadableFee()", () => {
		it("retreive reloadable fee", async () => {
			const fee = await service.getReloadableFee();
			console.log("fee:", fee);
		});
	});

	describe("setReloadableFee()", () => {
		it("set reloadable fee", async () => {
			const response = await service.setReloadableFee({
				fee: "1.5",
			});

			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
		});
	});
});
