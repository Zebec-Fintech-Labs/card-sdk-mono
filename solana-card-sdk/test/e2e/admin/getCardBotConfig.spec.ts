import { describe, it } from "mocha";

import { ZebecCardServiceBuilder } from "../../../src";
import { getProviders } from "../../shared";

describe("getCardBotConfigInfo", () => {
	const network = "devnet";
	const providers = getProviders(network);
	const wallets = providers.map((p) => p.wallet.publicKey.toString());
	console.log("wallets:", wallets);

	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider()
		.setProgram()
		.build();

	it("initialize card config and vaults", async () => {
		const info = await service.getCardBotConfigInfo();

		console.log("info", info);
	});
});
