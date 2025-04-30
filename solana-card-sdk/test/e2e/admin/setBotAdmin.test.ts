import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	parsePublicKeyString,
	SetNewBotAdminParams,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getProviders } from "../../shared";

describe("setBotAdmin()", () => {
	const network = "devnet";
	const provider = getProviders(network)[0];
	const service = new ZebecCardServiceBuilder()
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
