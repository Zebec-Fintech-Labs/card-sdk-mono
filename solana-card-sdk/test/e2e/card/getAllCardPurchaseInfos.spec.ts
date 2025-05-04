import { describe, it } from "mocha";

import { createReadonlyProvider, ZebecCardServiceBuilder } from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("getQuoteInfo", () => {
	const network = "devnet";
	const wallet = getWallets(network)[0];
	const connection = getConnection(network);

	const provider = createReadonlyProvider(connection, wallet.publicKey);
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("initialize card config and vaults", async () => {
		const buyerAddress = provider.publicKey!;
		const infos = await service.getAllCardPurchaseInfo(buyerAddress);

		console.log("infos:", infos);
	});
});
