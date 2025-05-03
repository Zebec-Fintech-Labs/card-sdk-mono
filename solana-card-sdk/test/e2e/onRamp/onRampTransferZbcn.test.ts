import {
	describe,
	it,
} from "mocha";

import {
	OnRampServiceBuilder,
	OnRampTransferZbcnParams,
	parseDecimalString,
	parsePublicKeyString,
} from "../../../src";
import { getProviders } from "../../shared";

describe("onRampStake()", () => {
	const network = "devnet";
	const providers = getProviders(network);
	const provider = providers[4];
	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("stake zbcn for on ramp", async () => {
		/** for devnet */
		const onRampAdminAddress = parsePublicKeyString(provider.publicKey.toString());
		const receiverAddress = parsePublicKeyString("41NWe3jQEQCiudncfVUq7uEMpBtSmsnmEX9fZTiZSTAP");

		const senderUserId = "0003";
		const amount = parseDecimalString(100);

		const params: OnRampTransferZbcnParams = {
			onRampAdminAddress,
			senderUserId,
			durationInDays: 2,
			receiverAddress,
			amount,
		};

		const payload = await service.onRampTransferZbcn(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});
});
