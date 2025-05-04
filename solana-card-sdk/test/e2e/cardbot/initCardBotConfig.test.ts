import { describe, it } from "mocha";

import { Program, web3 } from "@coral-xyz/anchor";

import {
	CardBotServiceBuilder,
	createAnchorProvider,
	InitBotConfigParams,
	parsePublicKeyString,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("initBotConfig()", () => {
	const network: web3.Cluster = "mainnet-beta";
	const connection = getConnection(network);
	const wallet = getWallets(network)[4];

	const provider = createAnchorProvider(connection, wallet);

	const service = new CardBotServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("initialize bot config", async () => {
		const zicOwnerAddress = parsePublicKeyString(provider.publicKey.toString());
		/** for devnet */
		// const botAdminAddress = parsePublicKeyString("5Eu8577bGqoRPNbCmJfJk2wUfN8FwuVPEThNFygaaFH9");

		/** for mainnet */
		const botAdminAddress = parsePublicKeyString("EcbeemyUhRhogppTHaGja2axU7PpZ2opPigry8qWDj1L");

		const params: InitBotConfigParams = {
			zicOwnerAddress,
			botAdminAddress,
		};

		const payload = await service.initBotConfig(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});
});
