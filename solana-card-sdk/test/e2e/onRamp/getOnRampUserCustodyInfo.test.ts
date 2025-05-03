import { describe, it } from "mocha";

import { deriveOnRampUserCustodyPda, OnRampServiceBuilder } from "../../../src";
import { getProviders } from "../../shared";

describe("getOnRampUserCustodyInfo()", () => {
	const network = "devnet";
	const providers = getProviders(network);
	const wallets = providers.map((p) => p.wallet.publicKey.toString());
	console.log("wallets:", wallets);

	const provider = providers[0];
	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("fetch on ramp user custody info", async () => {
		const userId = "0004";
		const userCustody = deriveOnRampUserCustodyPda(userId, service.program.programId);
		console.log("user custody:", userCustody.toString());

		const info = await service.getOnRampUserCustodyInfo(userCustody);

		console.log("info", info);
	});
});
