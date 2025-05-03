import { describe, it } from "mocha";

import {
	CardPurchaseInfo,
	createReadonlyProvider,
	deriveCardPurchaseInfoPda,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getConnection, getProviders } from "../../shared";

describe("getCardPurchaseInfo", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const buyerPubkey = getProviders(network)[2].publicKey;
	const provider = createReadonlyProvider(connection, buyerPubkey);
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("initialize card config and vaults", async () => {
		const buyerAddress = buyerPubkey.toString();
		// console.log("buyer", buyerAddress);
		const buyerCounter = BigInt("182");

		const buyerPda = deriveCardPurchaseInfoPda(
			buyerAddress,
			service.program.programId,
			buyerCounter,
		);
		// console.log("buyerpda:", buyerPda.toString());
		const info: CardPurchaseInfo = await service.getCardPurchaseInfo(buyerPda);

		console.log("info", info);
	});
});
