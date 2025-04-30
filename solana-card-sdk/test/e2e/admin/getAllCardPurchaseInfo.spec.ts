import { describe, it } from "mocha";

import { CardPurchaseInfo, ZebecCardServiceBuilder } from "../../../src";
import { getProviders } from "../../shared";

describe("getAllCardPurchaseInfo", () => {
	const network = "devnet";
	const provider = getProviders(network)[1];

	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();
	it("initialize card config and vaults", async () => {
		const buyerAddress = provider.publicKey.toString();
		console.log("buyer", buyerAddress);

		const infos: CardPurchaseInfo[] = await service.getAllCardPurchaseInfo(buyerAddress);

		console.log("infos", infos);
	});
});
