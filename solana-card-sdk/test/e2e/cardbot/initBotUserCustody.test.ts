import { describe, it } from "mocha";

import {
	CardBotServiceBuilder,
	createAnchorProvider,
	InitBotUserCustodyParams,
	parsePublicKeyString,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("initBotUserCustody()", () => {
	const network = "devnet";
	const wallet = getWallets(network)[4];
	const connection = getConnection(network);
	const provider = createAnchorProvider(connection, wallet);

	const service = new CardBotServiceBuilder()
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
