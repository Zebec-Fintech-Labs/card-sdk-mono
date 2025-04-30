import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import { ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM, ZebecCardServiceBuilder } from "../../../src";
import { getProviders } from "../../shared";

describe("getCardConfig", () => {
	const network = "devnet";
	const providers = getProviders(network);
	const wallets = providers.map((p) => p.wallet.publicKey.toString());
	console.log("wallets:", wallets);

	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider()
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("initialize card config and vaults", async () => {
		const info = await service.getOnRampConfigInfo();

		console.log("info", info);
	});
});
