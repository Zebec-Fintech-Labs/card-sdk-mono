import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	InitOnRampConfigParams,
	OnRampServiceBuilder,
	parsePublicKeyString,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
} from "../../../src";
import { getProviders } from "../../shared";

describe("initOnRampConfig", () => {
	const network = "mainnet-beta";
	const provider = getProviders(network)[0];

	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("initialize on ramp config", async () => {
		const zicOwnerAddress = parsePublicKeyString(provider.publicKey.toString());
		/** for devnet */
		// const onRampAdminAddress = parsePublicKeyString("5Eu8577bGqoRPNbCmJfJk2wUfN8FwuVPEThNFygaaFH9");
		// const zbcnAddress = parsePublicKeyString("5qEhjfVc5C6bz1Vi7Uj5SiSeDvqsMtZwuVS9njoVPcRr");
		/** for mainnet */
		const onRampAdminAddress = parsePublicKeyString("H2Bi1cjEJzHcLcFDzCJoVahtwN2dh1eG325VLhFc8r8C");
		const zbcnAddress = parsePublicKeyString("ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU");

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
