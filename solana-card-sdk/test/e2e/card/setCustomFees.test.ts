import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	parsePercentString,
	parsePublicKeyString,
	SetCustomFeesParams,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getProviders } from "../../shared";

describe("setCustomFees", () => {
	const network = "devnet";
	const provider = getProviders(network)[0];
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("sets custom fees", async () => {
		const zicOwnerAddress = provider.publicKey.toString();
		console.log("zic owner address:", zicOwnerAddress);

		const usdcAddress = "De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc";

		const tokenFeeList = [
			{
				tokenAddress: "94k6yWxV88rfVe1r1QHwubkvC7sb3GFFTPWmJDdFb23i",
				fee: 0,
			},
		].map(({ tokenAddress, fee }) => ({
			tokenAddress: parsePublicKeyString(tokenAddress),
			fee: parsePercentString(fee),
		}));

		const params: SetCustomFeesParams = {
			zicOwnerAddress: parsePublicKeyString(zicOwnerAddress),
			tokenFeeList,
		};

		const payload = await service.setCustomFees(params);

		const signature = await payload.execute({ preflightCommitment: "confirmed" });

		console.log("signature", signature);
	});
});
