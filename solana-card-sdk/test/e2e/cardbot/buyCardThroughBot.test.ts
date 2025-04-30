import { describe, it } from "mocha";

import {
	BuyCardThroughBotParams,
	parseDecimalString,
	parsePublicKeyString,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getProviders } from "../../shared";

describe("buyCardThroughBot()", () => {
	const network = "devnet";
	const provider = getProviders(network)[4];
	const service = new ZebecCardServiceBuilder()
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
