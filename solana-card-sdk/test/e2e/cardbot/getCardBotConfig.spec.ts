import { describe, it } from "mocha";

import { CardBotServiceBuilder } from "../../../src";
import { getWallets } from "../../shared";

describe("getCardBotConfigInfo", () => {
	const network = "devnet";
	const wallets = getWallets(network);
	console.log("wallets:", wallets);

	const service = new CardBotServiceBuilder()
		.setNetwork(network)
		.setProvider()
		.setProgram()
		.build();

	it("initialize card config and vaults", async () => {
		const info = await service.getCardBotConfigInfo();

		console.log("info", info);
	});
});
