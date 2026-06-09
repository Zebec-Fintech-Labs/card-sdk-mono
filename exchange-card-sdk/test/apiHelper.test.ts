import assert from "assert";

import { CARD_API_URL, ZebecCardAPIService } from "../src";

describe("ZebecCardAPIService", () => {
	it("should initialize with correct API URL", async () => {
		const service = new ZebecCardAPIService(true);
		const expectedUrl = CARD_API_URL.Sandbox;
		assert.strictEqual(service.apiUrl, expectedUrl, "API URL should match sandbox URL");
	});

	it("should fetch vault information", async () => {
		const service = new ZebecCardAPIService();

		const isAlive = await service.ping();
		console.log("API is alive:", isAlive);

		const expectedUrl = CARD_API_URL.Production;
		assert.strictEqual(service.apiUrl, expectedUrl, "API URL should match sandbox URL");

		const vault = await service.fetchVault("ALGO");
		console.log("Fetched vault:", vault);
		assert(vault?.address, "Vault address should be defined");
	});

	it("should fetch vault information by mint address", async () => {
		const service = new ZebecCardAPIService();

		const isAlive = await service.ping();
		console.log("API is alive:", isAlive);

		const expectedUrl = CARD_API_URL.Production;
		assert.strictEqual(service.apiUrl, expectedUrl, "API URL should match sandbox URL");

		const vault = await service.fetchVaultByMintAddress("31566704");
		console.log("Fetched vault:", vault);

		assert.ok(vault?.address, "Vault address should be defined");
	})
});
