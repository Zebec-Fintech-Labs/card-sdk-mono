// import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	createAnchorProvider,
	InitOnRampConfigParams,
	OnRampServiceBuilder,
	parsePublicKeyString,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("initOnRampConfig", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const wallet = getWallets(network)[0];
	const provider = createAnchorProvider(connection, wallet);

	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("initialize on ramp config", async () => {
		const zicOwnerAddress = parsePublicKeyString(provider.publicKey.toString());
		/** for devnet */
		const onRampAdminAddress = parsePublicKeyString("2amZiVsTuVuJfG3PwKkPwVBNWHsfRoLxEW2wkadPT6D4");
		const zbcnAddress = parsePublicKeyString("De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc");
		/** for mainnet */
		// const onRampAdminAddress = parsePublicKeyString("H2Bi1cjEJzHcLcFDzCJoVahtwN2dh1eG325VLhFc8r8C");
		// const zbcnAddress = parsePublicKeyString("ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU");

		const params: InitOnRampConfigParams = {
			zicOwnerAddress,
			onRampAdminAddress,
			zbcnAddress,
		};

		const payload = await service.initOnRampConfig(params);

		const signature = await payload.execute();
		console.log("signature", signature);
	});
});
