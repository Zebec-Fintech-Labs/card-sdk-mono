import { describe, it } from "mocha";

import { CardBotServiceBuilder, createAnchorProvider } from "../../../src";
import { deriveBotUserCustodyPda } from "../../../src/pda";
import { getConnection, getWallets } from "../../shared";

describe("getBotUserCustodyInfo()", () => {
	const network = "devnet";
	const wallet = getWallets(network)[4];
	const connection = getConnection(network);
	const provider = createAnchorProvider(connection, wallet);

	const service = new CardBotServiceBuilder()
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
