import { describe, it } from "mocha";

import { ZebecCardServiceBuilder } from "../../../src";
import { deriveBotUserCustodyPda } from "../../../src/pda";
import { getProviders } from "../../shared";

describe("getBotUserCustodyInfo()", () => {
	const network = "devnet";
	const providers = getProviders(network);
	const provider = providers[0];
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("fetch bot user custody info", async () => {
		const userId = "0001";

		const userCustody = deriveBotUserCustodyPda(userId, service.program.programId);
		console.log("userCustody:", userCustody.toString());
		const info = await service.getBotUserCustodyInfo(userCustody);

		console.log("info", info);
	});
});
