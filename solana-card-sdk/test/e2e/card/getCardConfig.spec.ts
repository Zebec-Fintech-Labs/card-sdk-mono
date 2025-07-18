// import { describe, it } from "mocha";

import { CardConfigInfo, ZebecCardServiceBuilder } from "../../../src";
import { getWallets } from "../../shared";

describe("getCardConfig", () => {
	const network = "mainnet-beta";
	const wallets = getWallets(network);
	console.log("wallets:", wallets);

	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider()
		.setProgram()
		.build();

	it("initialize card config and vaults", async () => {
		const info: CardConfigInfo = await service.getCardConfigInfo();

		console.log("info", info);
		console.log("feeTiers", info.providerConfig.feeTiers);
	});
});
