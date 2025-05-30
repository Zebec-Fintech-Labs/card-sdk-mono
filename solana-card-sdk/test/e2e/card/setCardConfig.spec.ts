import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	createAnchorProvider,
	parseDecimalString,
	parseFeeTiers,
	parsePercentString,
	SetCardConfigParams,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("setCardConfig", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const wallets = getWallets(network);
	const wallet = wallets[1];
	const provider = createAnchorProvider(connection, wallet);
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("update card configs", async () => {
		const zicOwnerAddress = provider.publicKey.toString();
		const cardVaultAddress = "41NWe3jQEQCiudncfVUq7uEMpBtSmsnmEX9fZTiZSTAP";
		const revenueVaultAddress = "2amZiVsTuVuJfG3PwKkPwVBNWHsfRoLxEW2wkadPT6D4";
		const commissionVaultAddress = "2amZiVsTuVuJfG3PwKkPwVBNWHsfRoLxEW2wkadPT6D4";
		const revenueFeePercent = "2.5";
		const nativeFeePercent = "1.5";
		const nonNativeFeePercent = "5";
		const minCardAmount = "10";
		const maxCardAmount = "1500";
		const dailyCardPurchaseLimit = "1500";

		const feeTiers = parseFeeTiers([
			{ minAmount: "5", maxAmount: "100", feePercent: "6.5" },
			{ minAmount: "101", maxAmount: "500", feePercent: "3" },
			{ minAmount: "501", maxAmount: "1500", feePercent: "0.5" },
		]);

		const params: SetCardConfigParams = {
			revenueFeePercent: parsePercentString(revenueFeePercent),
			nativeFeePercent: parsePercentString(nativeFeePercent),
			nonNativeFeePercent: parsePercentString(nonNativeFeePercent),
			commissionVaultAddress,
			zicOwnerAddress,
			cardVaultAddress,
			revenueVaultAddress,
			feeTiers,
			newZicOwnerAddress: wallets[0].publicKey.toString(),
			maxCardAmount: parseDecimalString(maxCardAmount),
			minCardAmount: parseDecimalString(minCardAmount),
			dailyCardPurchaseLimit: parseDecimalString(dailyCardPurchaseLimit),
		};

		const payload = await service.setCardConfig(params);

		const signature = await payload.execute();

		console.log("signature", signature);
	});
});
