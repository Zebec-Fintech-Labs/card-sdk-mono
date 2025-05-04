import { describe, it } from "mocha";

import {
	createAnchorProvider,
	InitOnRampUserCustodyParams,
	OnRampServiceBuilder,
	parsePublicKeyString,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("initOnRampUserCustody()", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const wallet = getWallets(network)[4];
	const provider = createAnchorProvider(connection, wallet);

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
