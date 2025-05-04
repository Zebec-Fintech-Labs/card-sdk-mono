import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	createAnchorProvider,
	InitCardConfigParams,
	parseDecimalString,
	parseFeeTiers,
	parsePercentString,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("initCardConfig", () => {
	const network = "mainnet-beta";
	const connection = getConnection(network);
	const wallet = getWallets(network)[0];
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(createAnchorProvider(connection, wallet))
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("initialize card config and vaults", async () => {
		/** for devnet */
		// const zicOwnerAddress = provider.publicKey.toString();
		// const cardVaultAddress = "7yJfc32yFeRWTsPQjon38zEuKPGQLbAy8hoz3CVa5A8u";
		// const revenueVaultAddress = "9EYFiACQrVYYYZaZiE6gD82TfUPXu9FqABbckVMRvHLV";
		// const commissionVaultAddress = "2efiJoaS2C6tEgWWhXaHxWDPJBk6XLL3TVS6ERXx4AX4";
		// const revenueFeePercent = "2.5";
		// const nativeFeePercent = "1.5";
		// const nonNativeFeePercent = "5";
		// const usdcAddress = "De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc";
		// const minCardAmount = "5";
		// const maxCardAmount = "500";
		// const dailyCardPurchaseLimit = "1000";

		const feeTiers = parseFeeTiers([
			{ minAmount: "5", maxAmount: "100", feePercent: "6.5" },
			{ minAmount: "101", maxAmount: "500", feePercent: "3" },
			{ minAmount: "501", maxAmount: "1000", feePercent: "0.5" },
		]);

		/** for mainnet */
		const zicOwnerAddress = wallet.publicKey.toString();
		const cardVaultAddress = "5Eu8577bGqoRPNbCmJfJk2wUfN8FwuVPEThNFygaaFH9";
		const revenueVaultAddress = "3UksGKzKJZtbpzW9o2yhtUVCYpKn5c91XqmSEgJG1j4B";
		const commissionVaultAddress = "3UksGKzKJZtbpzW9o2yhtUVCYpKn5c91XqmSEgJG1j4B";

		const revenueFeePercent = "2.5";
		const nativeFeePercent = "1.5";
		const nonNativeFeePercent = "5";
		const usdcAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
		const minCardAmount = "5";
		const maxCardAmount = "500";
		const dailyCardPurchaseLimit = "1000";

		const params: InitCardConfigParams = {
			revenueFeePercent: parsePercentString(revenueFeePercent),
			nativeFeePercent: parsePercentString(nativeFeePercent),
			nonNativeFeePercent: parsePercentString(nonNativeFeePercent),
			zicOwnerAddress,
			usdcAddress,
			commissionVaultAddress,
			cardVaultAddress,
			revenueVaultAddress,
			maxCardAmount: parseDecimalString(maxCardAmount),
			minCardAmount: parseDecimalString(minCardAmount),
			feeTiers,
			dailyCardPurchaseLimit: parseDecimalString(dailyCardPurchaseLimit),
		};

		const payload = await service.initCardConfig(params);

		const signature = await payload.execute({ commitment: "confirmed" });
		console.log("signature", signature);
	});
});
