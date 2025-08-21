import { describe } from "mocha";

import { ZanoService } from "../src";

const service = new ZanoService(
	{
		daemonUrl: "http://localhost:12111/json_rpc",
		walletUrl: "http://localhost:12111/json_rpc",
	},
	{
		apiKey: process.env.API_KEY!,
		encryptionKey: process.env.ENCRYPTION_KEY!,
	},
	{
		sandbox: true,
	},
);

describe("ZanoService", () => {
	it("should transfer ZANO", async () => {
		const zanoAssetId = "d6329b5b1f7c0805b5c345f4957554002a2f557845f64d7645dae0e051a6498a";
		const signature = await service.transferAssets({
			amount: "0.1",
			assetId: zanoAssetId,
		});
		console.log("Transfer signature:", signature);
	});

	it("should get token balance", async () => {
		const balances = await service.getBalances();

		console.log("Token balance:", balances);
	});
});
