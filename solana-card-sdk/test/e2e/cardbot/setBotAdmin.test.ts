import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	CardBotServiceBuilder,
	createAnchorProvider,
	parsePublicKeyString,
	SetNewBotAdminParams,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("setBotAdmin()", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const wallet = getWallets(network)[0];
	const provider = createAnchorProvider(connection, wallet);

	const service = new CardBotServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("set Bot Admin", async () => {
		const zicOwnerAddress = parsePublicKeyString(provider.publicKey.toString());
		/** for devnet */
		const newBotAdminAddress = parsePublicKeyString("2amZiVsTuVuJfG3PwKkPwVBNWHsfRoLxEW2wkadPT6D4");

		/** for mainnet */
		// const botAdminAddress = parsePublicKeyString("5Eu8577bGqoRPNbCmJfJk2wUfN8FwuVPEThNFygaaFH9");

		const params: SetNewBotAdminParams = {
			zicOwnerAddress,
			newBotAdminAddress,
		};

		const payload = await service.setBotAdmin(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});
});
