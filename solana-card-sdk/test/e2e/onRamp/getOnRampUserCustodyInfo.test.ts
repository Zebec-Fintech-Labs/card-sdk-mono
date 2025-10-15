import { describe, it } from "mocha";

import {
	createReadonlyProvider,
	deriveOnRampUserCustodyPda,
	OnRampServiceBuilder,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("getOnRampUserCustodyInfo()", () => {
	const network = "devnet";
	const wallet = getWallets(network)[0];
	const connection = getConnection(network);

	const provider = createReadonlyProvider(connection, wallet.publicKey);

	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("fetch on ramp user custody info", async () => {
		const userId = "0004";
		const userCustody = deriveOnRampUserCustodyPda(userId, service.onRampProgram.programId);
		console.log("user custody:", userCustody.toString());

		const info = await service.getOnRampUserCustodyInfo(userCustody);

		console.log("info", info);
	});
});
