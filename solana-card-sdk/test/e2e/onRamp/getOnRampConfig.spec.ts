import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import { OnRampServiceBuilder, ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM } from "../../../src";
import { getWallets } from "../../shared";

describe("getCardConfig", () => {
	const network = "devnet";
	const wallets = getWallets(network);
	console.log("wallets:", wallets);

	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider()
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("initialize card config and vaults", async () => {
		const info = await service.getOnRampConfigInfo();

		console.log("info", info);
	});
});
