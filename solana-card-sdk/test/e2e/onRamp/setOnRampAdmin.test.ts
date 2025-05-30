import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	createAnchorProvider,
	OnRampServiceBuilder,
	parsePublicKeyString,
	SetNewOnRampAdminParams,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("setOnRampAdmin()", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const wallet = getWallets(network)[4];
	const provider = createAnchorProvider(connection, wallet);

	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("set on ramp admin", async () => {
		const zicOwnerAddress = parsePublicKeyString(provider.publicKey.toString());
		/** for devnet */
		const newOnRampAdminAddress = parsePublicKeyString(
			"2amZiVsTuVuJfG3PwKkPwVBNWHsfRoLxEW2wkadPT6D4",
		);

		/** for mainnet */
		// const botAdminAddress = parsePublicKeyString("5Eu8577bGqoRPNbCmJfJk2wUfN8FwuVPEThNFygaaFH9");

		const params: SetNewOnRampAdminParams = {
			zicOwnerAddress,
			newOnRampAdminAddress,
		};

		const payload = await service.setOnRampAdmin(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});
});
