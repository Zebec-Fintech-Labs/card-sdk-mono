import { describe, it } from "mocha";

import { CardConfigInfo, ZebecCardServiceBuilder } from "../../../src";
import { getProviders } from "../../shared";

describe("getCardConfig", () => {
	const network = "mainnet-beta";
	const providers = getProviders(network);
	const wallets = providers.map((p) => p.wallet.publicKey.toString());
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
