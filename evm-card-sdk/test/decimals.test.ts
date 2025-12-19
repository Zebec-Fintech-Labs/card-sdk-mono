import assert from "assert";
import { ethers } from "ethers";
import { describe } from "mocha";

import { SupportedChain, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./shared";

describe("ZebecCardService: usdcToken.decimals", () => {
	let service: ZebecCardService;
	let chainId: SupportedChain;
	let provider: ethers.JsonRpcProvider;
	let signers: ethers.Signer[];
	let signer: ethers.Signer;
	describe("usdcToken.decimals()", () => {
		it("Should return correct decimals for each chain", async () => {
			// Sepolia
			chainId = SupportedChain.Sepolia;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			let decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 6n, "Decimals should be 6 for Sepolia USDC");

			// Base
			chainId = SupportedChain.Base;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 6n, "Decimals should be 6 for Base USDC");

			// Bsc
			chainId = SupportedChain.Bsc;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 18n, "Decimals should be 6 for Bsc USDC");

			//  Bsc Testnet
			chainId = SupportedChain.BscTestnet;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 18n, "Decimals should be 6 for BscTestnet USDC");

			// Ethereum Mainnet
			chainId = SupportedChain.Mainnet;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 6n, "Decimals should be 6 for Mainnet USDC");

			// Odyssey
			chainId = SupportedChain.Odyssey;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 6n, "Decimals should be 6 for Odyssey USDC");

			// Odyssey Testnet
			chainId = SupportedChain.OdysseyTestnet;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 6n, "Decimals should be 6 for OdysseyTestnet USDC");

			// Polygon
			chainId = SupportedChain.Polygon;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 6n, "Decimals should be 6 for Polygon USDC");

			// Polygon Amoy
			chainId = SupportedChain.PolygonAmoy;
			provider = getProvider(chainId);
			signers = getSigners(provider);
			signer = signers[1];

			service = new ZebecCardService(signer, chainId);
			decimals = await service.usdcToken.decimals();

			assert.deepStrictEqual(decimals, 6n, "Decimals should be 6 for PolygonAmoy USDC");
		});
	});
});
