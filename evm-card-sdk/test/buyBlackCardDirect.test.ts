import { ethers } from "ethers";
import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);

const signers = getSigners(provider);
console.log(
	"signers ==>",
	signers.map((s) => s.address),
);
const signer = signers[1];
const adminSigner = signers[1]; // backend admin key (matches contract admin())

const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: buyBlackCardDirect", () => {
	it("Should load black card with backend-signed fee and daily limit", async () => {
		const amount = "50";
		const feeAmount = "0.5";
		const dailyCardBuyLimit = "1000";
		const minCardAmount = "5";
		const maxCardAmount = "1000";
		const token = await service.usdcToken.getAddress();
		const spender = await service.zebecCard.getAddress();

		// Approve USDC spending
		const approval = await service.approve({
			amount,
			spender,
			token,
			overrides: { gasLimit: 300000 },
		});
		if (approval) await approval.wait();

		// Gather signature inputs
		const nonce = await service.getUserNonce({ userAddress: signer.address });
		const usdcAddress = await service.usdcToken.getAddress();
		const verifyingContract = await service.zebecCard.getAddress();
		const decimals = await service.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(amount, decimals);
		const parsedFeeAmount = ethers.parseUnits(feeAmount, decimals);
		const parsedDailyLimit = ethers.parseUnits(dailyCardBuyLimit, decimals);
		const parsedMinAmount = ethers.parseUnits(minCardAmount, decimals);
		const parsedMaxAmount = ethers.parseUnits(maxCardAmount, decimals);

		const validUntil = BigInt(Math.floor(Date.now() / 1000) + 3600);

		const domain = {
			name: "ZebecCard",
			version: "2",
			chainId,
			verifyingContract,
		};

		const types = {
			BlackCardDirect: [
				{ name: "user", type: "address" },
				{ name: "token", type: "address" },
				{ name: "amount", type: "uint256" },
				{ name: "feeAmount", type: "uint256" },
				{ name: "dailyCardBuyLimit", type: "uint256" },
				{ name: "minCardAmount", type: "uint256" },
				{ name: "maxCardAmount", type: "uint256" },
				{ name: "validUntil", type: "uint256" },
				{ name: "nonce", type: "uint256" },
			],
		};

		const value = {
			user: signer.address,
			token: usdcAddress,
			amount: parsedAmount,
			feeAmount: parsedFeeAmount,
			dailyCardBuyLimit: parsedDailyLimit,
			minCardAmount: parsedMinAmount,
			maxCardAmount: parsedMaxAmount,
			validUntil,
			nonce,
		};

		const signature = await adminSigner.signTypedData(domain, types, value);

		const response = await service.buyBlackCardDirect({
			amount,
			cardType: "black",
			buyerEmail: "black@example.com",
			signatureData: {
				feeAmount,
				dailyCardBuyLimit,
				minCardAmount,
				maxCardAmount,
				validUntil,
				signature,
			},
		});

		const receipt = await response.wait();
		console.log("txhash:", receipt?.hash);
		console.log("status:", receipt?.status);
	});

	it("Should reject expired quote", async () => {
		const amount = "50";
		const feeAmount = "0.5";
		const dailyCardBuyLimit = "1000";
		const minCardAmount = "5";
		const maxCardAmount = "1000";
		const token = await service.usdcToken.getAddress();
		const spender = await service.zebecCard.getAddress();

		const approval = await service.approve({
			amount,
			spender,
			token,
			overrides: { gasLimit: 300000 },
		});
		if (approval) await approval.wait();

		const nonce = await service.getUserNonce({ userAddress: signer.address });
		const usdcAddress = await service.usdcToken.getAddress();
		const verifyingContract = await service.zebecCard.getAddress();
		const decimals = await service.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(amount, decimals);
		const parsedFeeAmount = ethers.parseUnits(feeAmount, decimals);
		const parsedDailyLimit = ethers.parseUnits(dailyCardBuyLimit, decimals);
		const parsedMinAmount = ethers.parseUnits(minCardAmount, decimals);
		const parsedMaxAmount = ethers.parseUnits(maxCardAmount, decimals);

		// Expired timestamp (1 minute ago)
		const validUntil = BigInt(Math.floor(Date.now() / 1000) - 60);

		const domain = {
			name: "ZebecCard",
			version: "2",
			chainId,
			verifyingContract,
		};

		const types = {
			BlackCardDirect: [
				{ name: "user", type: "address" },
				{ name: "token", type: "address" },
				{ name: "amount", type: "uint256" },
				{ name: "feeAmount", type: "uint256" },
				{ name: "dailyCardBuyLimit", type: "uint256" },
				{ name: "minCardAmount", type: "uint256" },
				{ name: "maxCardAmount", type: "uint256" },
				{ name: "validUntil", type: "uint256" },
				{ name: "nonce", type: "uint256" },
			],
		};

		const value = {
			user: signer.address,
			token: usdcAddress,
			amount: parsedAmount,
			feeAmount: parsedFeeAmount,
			dailyCardBuyLimit: parsedDailyLimit,
			minCardAmount: parsedMinAmount,
			maxCardAmount: parsedMaxAmount,
			validUntil,
			nonce,
		};

		const signature = await adminSigner.signTypedData(domain, types, value);

		try {
			await service.buyBlackCardDirect({
				amount,
				cardType: "black",
				buyerEmail: "black@example.com",
				signatureData: {
					feeAmount,
					dailyCardBuyLimit,
					minCardAmount,
					maxCardAmount,
					validUntil,
					signature,
				},
			});
			throw new Error("Expected transaction to fail with QuoteExpired");
		} catch (error: any) {
			if (!error.message.includes("QuoteExpired")) {
				throw error;
			}
			console.log("Correctly rejected expired quote");
		}
	});

	it("Should reject tampered validUntil", async () => {
		const amount = "50";
		const feeAmount = "0.5";
		const dailyCardBuyLimit = "1000";
		const minCardAmount = "5";
		const maxCardAmount = "1000";
		const token = await service.usdcToken.getAddress();
		const spender = await service.zebecCard.getAddress();

		const approval = await service.approve({
			amount,
			spender,
			token,
			overrides: { gasLimit: 300000 },
		});
		if (approval) await approval.wait();

		const nonce = await service.getUserNonce({ userAddress: signer.address });
		const usdcAddress = await service.usdcToken.getAddress();
		const verifyingContract = await service.zebecCard.getAddress();
		const decimals = await service.usdcToken.decimals();
		const parsedAmount = ethers.parseUnits(amount, decimals);
		const parsedFeeAmount = ethers.parseUnits(feeAmount, decimals);
		const parsedDailyLimit = ethers.parseUnits(dailyCardBuyLimit, decimals);
		const parsedMinAmount = ethers.parseUnits(minCardAmount, decimals);
		const parsedMaxAmount = ethers.parseUnits(maxCardAmount, decimals);

		const validUntil = BigInt(Math.floor(Date.now() / 1000) + 3600);
		const tamperedValidUntil = validUntil + 3600n;

		const domain = {
			name: "ZebecCard",
			version: "2",
			chainId,
			verifyingContract,
		};

		const types = {
			BlackCardDirect: [
				{ name: "user", type: "address" },
				{ name: "token", type: "address" },
				{ name: "amount", type: "uint256" },
				{ name: "feeAmount", type: "uint256" },
				{ name: "dailyCardBuyLimit", type: "uint256" },
				{ name: "minCardAmount", type: "uint256" },
				{ name: "maxCardAmount", type: "uint256" },
				{ name: "validUntil", type: "uint256" },
				{ name: "nonce", type: "uint256" },
			],
		};

		const value = {
			user: signer.address,
			token: usdcAddress,
			amount: parsedAmount,
			feeAmount: parsedFeeAmount,
			dailyCardBuyLimit: parsedDailyLimit,
			minCardAmount: parsedMinAmount,
			maxCardAmount: parsedMaxAmount,
			validUntil,
			nonce,
		};

		const signature = await adminSigner.signTypedData(domain, types, value);

		try {
			await service.buyBlackCardDirect({
				amount,
				cardType: "black",
				buyerEmail: "black@example.com",
				signatureData: {
					feeAmount,
					dailyCardBuyLimit,
					validUntil: tamperedValidUntil,
					signature,
				},
			});
			throw new Error("Expected transaction to fail with Invalid signature");
		} catch (error: any) {
			if (!error.message.includes("Invalid signature")) {
				throw error;
			}
			console.log("Correctly rejected tampered validUntil");
		}
	});
});
