import { describe, it } from "mocha";

import {
	createAnchorProvider,
	DeleteCustomFeesParams,
	parsePublicKeyString,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("deleteCustomFees()", () => {
	const network = "devnet";
	const wallet = getWallets(network)[0];
	const connection = getConnection(network);
	const provider = createAnchorProvider(connection, wallet);

	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("delete custom fees", async () => {
		const zicOwnerAddress = provider.publicKey.toString();
		const usdcAddress = "De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc";

		const customFees = await service.getCustomTokenFees("confirmed");

		console.log("customfees len:", customFees.length);

		const tokenAddress = customFees.filter(
			(tokenFee) => tokenFee.tokenAddress.toString() !== usdcAddress,
		)[0].tokenAddress;

		const tokenAddressList = [tokenAddress];

		const params: DeleteCustomFeesParams = {
			zicOwnerAddress: parsePublicKeyString(zicOwnerAddress),
			tokenAddressList,
		};

		const payload = await service.deleteCustomFees(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});

		console.log("signature", signature);

		const customFeesAfter = await service.getCustomTokenFees("confirmed");
		console.log(
			"deleted token exists:",
			customFeesAfter.some((tf) => tf.tokenAddress === tokenAddress),
		);
		console.log("customfees len:", customFeesAfter.length);
	});
});
