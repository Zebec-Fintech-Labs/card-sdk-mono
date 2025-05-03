import { describe, it } from "mocha";

import {
	InitOnRampUserCustodyParams,
	OnRampServiceBuilder,
	parsePublicKeyString,
} from "../../../src";
import { getProviders } from "../../shared";

describe("initOnRampUserCustody()", () => {
	const network = "devnet";
	const providers = getProviders(network);
	const provider = providers[4];
	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("initialize on ramp user custody", async () => {
		/** for devnet */
		const onRampAdminAddress = parsePublicKeyString(provider.publicKey.toString());
		const userId = "0004";

		const params: InitOnRampUserCustodyParams = {
			onRampAdminAddress,
			userId,
		};

		const payload = await service.initOnRampUserCustody(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});
});
