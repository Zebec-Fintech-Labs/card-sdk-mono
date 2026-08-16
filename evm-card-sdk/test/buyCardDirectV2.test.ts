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

describe("ZebecCardService: buyCardDirectV2", () => {
	describe("buyCardDirectV2()", () => {
		it("Should buy card directly with valid backend signature", async () => {
			// 1. Log balances
			console.log(
				"user balance: ",
				ethers.formatEther((await signer.provider?.getBalance(signer.address)) || 0n),
			);
			console.log("token balance:", await service.usdcToken.balanceOf(signer));

			const amount = "10";
			const feeAmount = "1";
			const token = await service.usdcToken.getAddress();
			const spender = await service.zebecCard.getAddress();
			console.log("amount: ", amount);
			console.log("token:", token);

			// 2. Approve USDC spending
			const approval = await service.approve({
				amount,
				spender,
				token,
				overrides: {
					gasLimit: 300000,
				},
			});

			if (approval) {
				const receipt0 = await approval.wait();
				console.log("approval hash:", receipt0?.hash);
			}

			// 3. Gather signature inputs
			const nonce = "0";
			const usdcAddress = await service.usdcToken.getAddress();
			const verifyingContract = await service.zebecCard.getAddress();
			const decimals = await service.usdcToken.decimals();
			const parsedAmount = ethers.parseUnits(amount, decimals);
			const parsedFeeAmount = ethers.parseUnits(feeAmount, decimals);

			console.log("nonce:", nonce.toString());
			console.log("usdc address:", usdcAddress);
			console.log("verifying contract:", verifyingContract);
			console.log("parsed amount:", parsedAmount.toString());
			console.log("parsed fee amount:", parsedFeeAmount.toString());

			// 4. Build EIP-712 signature
			const domain = {
				name: "ZebecCard",
				version: "2",
				chainId,
				verifyingContract,
			};

			const types = {
				DirectPaymentV2: [
					{ name: "user", type: "address" },
					{ name: "token", type: "address" },
					{ name: "amount", type: "uint256" },
					{ name: "feeAmount", type: "uint256" },
					{ name: "nonce", type: "uint256" },
				],
			};

			const value = {
				user: signer.address,
				token: usdcAddress,
				amount: parsedAmount,
				feeAmount: parsedFeeAmount,
				nonce,
			};

			console.log("Signing with admin:", adminSigner.address);
			const signature = await adminSigner.signTypedData(domain, types, value);
			console.log("signature:", signature);

			// 5. Execute buyCardDirectV2
			const response = await service.buyCardDirectV2({
				amount,
				cardType: "silver",
				buyerEmail: "user@gmail.com",
				signatureData: {
					feeAmount,
					signature,
				},
			});

			// 6. Wait and log tx hash
			const receipt = await response.wait();
			console.log("txhash:", receipt?.hash);
			console.log("status:", receipt?.status);
		});
	});
});
