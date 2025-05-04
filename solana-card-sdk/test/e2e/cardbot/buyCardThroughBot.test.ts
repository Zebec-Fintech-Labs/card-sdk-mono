import { describe, it } from "mocha";

import {
	BuyCardThroughBotParams,
	CardBotServiceBuilder,
	createAnchorProvider,
	parseDecimalString,
	parsePublicKeyString,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("buyCardThroughBot()", () => {
	const network = "devnet";
	const wallet = getWallets(network)[4];
	const connection = getConnection(network);
	const provider = createAnchorProvider(connection, wallet);

	const service = new CardBotServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("buy card through bot", async () => {
		const botAdminAddress = parsePublicKeyString(provider.publicKey.toString());
		const usdcMintAddress = parsePublicKeyString("De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc");
		const userId = "0001";
		const amount = parseDecimalString(100);

		const params: BuyCardThroughBotParams = {
			amount,
			botAdminAddress,
			userId,
			usdcMintAddress,
			cardType: "carbon",
		};

		const payload = await service.buyCardThroughBot(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});
});
