import { describe, it } from "mocha";

import DAPIClient from "@dashevo/dapi-client";

const client = new DAPIClient({ network: "testnet" });

describe("exp. dashTransfer", () => {
	it("should be run", async () => {
		const bestBlockHash = await client.core.getBestBlockHash();
		console.log(bestBlockHash);
	});
});
