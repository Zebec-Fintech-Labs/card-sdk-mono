import assert from "assert";
import { describe } from "mocha";
import { ethers } from "ethers";

import { SupportedChain, USDC_ADDRESS, WETH_ADDRESS, ZebecCardService } from "../src";
import { fetchSwapData, getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Robinhood;
const provider = getProvider(chainId);
const signers = getSigners(provider);
const signer = signers[0];
console.log(
	"signers:",
	signers.map((s) => s.address),
);
const service = new ZebecCardService(signer, chainId);

describe("ZebecCardService: swapAndBuyCardDirect", () => {
	describe("swapAndBuyCardDirect()", () => {
		it("Should transfer balance from user's wallet to revenue vault", async () => {
			// const brett = "0x532f27101965dd16442E59d40670FaF5eBB142E4";
			// const mgames = "0xD92B53EF83afAf0d0A0167cF7aC5951AD1994824";
			const WETH = WETH_ADDRESS[chainId];
			console.log("WETH:", WETH);
			const amount = "0.005"; // ~$12.48 (taken from MetaMask swap quote)
			const spender = await service.zebecCard.getAddress();

			// Skip wrap if WETH balance is already sufficient
			const wethContract = new ethers.Contract(
				WETH,
				["function balanceOf(address) view returns (uint256)"],
				provider,
			);
			const wethBalance = await wethContract.balanceOf(signer.address);
			console.log("WETH balance:", ethers.formatUnits(wethBalance, 18));
			if (wethBalance < ethers.parseUnits(amount, 18)) {
				const wrapEth = await service.wrapEth({
					amount,
				});
				const wrapEthReceipt = await wrapEth.wait();
				console.log("wrapEth hash:", wrapEthReceipt?.hash);
			} else {
				console.log("Skipping wrap, sufficient WETH already available");
			}

			const approval1 = await service.approve({
				amount,
				spender,
				token: WETH,
			});

			if (approval1) {
				const receipt1 = await approval1.wait();
				console.log("approval hash:", receipt1?.hash);
			}

			const data = await fetchSwapData({
				amount,
				chainName: "ROBINHOOD",
				slippage: 1,
				srcSymbol: "ETH",
				type: "EXACT_IN",
				from: signer.address,
			});
			console.log("Data before swap execution:", data);

			assert(!("error" in data), "Error in swap data response");
			console.log("spender:", spender);

			const response = await service.swapAndBuyCardDirect({
				cardType: "silver",
				buyerEmail: "user@gmail.com",
				swapData: data,
			});
			const receipt2 = await response.wait();
			console.log("swap and buycard hash:", receipt2?.hash);
		});
	});
});
