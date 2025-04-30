import { describe, it } from "mocha";

import {
	InitBotUserCustodyParams,
	parsePublicKeyString,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getProviders } from "../../shared";

describe("initBotUserCustody()", () => {
	const network = "devnet";
	const providers = getProviders(network);
	const provider = providers[4];
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("init bot user custody", async () => {
		/** for devnet */
		const botAdminAddress = parsePublicKeyString(provider.publicKey.toString());
		const usdcMintAddress = parsePublicKeyString("De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc");
		const userId = "0001";

		const params: InitBotUserCustodyParams = {
			botAdminAddress,
			usdcMintAddress,
			userId,
		};

		const payload = await service.initBotUserCustody(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});
});
