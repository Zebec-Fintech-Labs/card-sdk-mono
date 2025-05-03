import { describe, it } from "mocha";

import { ZebecCardServiceBuilder } from "../../../src";
import { getProviders } from "../../shared";

describe("getQuoteInfo", () => {
	const network = "devnet";
	const provider = getProviders(network)[1];
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("initialize card config and vaults", async () => {
		const buyerAddress = provider.publicKey;
		const infos = await service.getAllCardPurchaseInfo(buyerAddress);

		console.log("infos:", infos);
	});
});
