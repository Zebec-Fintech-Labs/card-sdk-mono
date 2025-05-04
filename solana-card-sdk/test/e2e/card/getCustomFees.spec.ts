import { describe, it } from "mocha";

import { ZebecCardServiceBuilder } from "../../../src";
import { deriveReloadableCardPda, deriveTokenFeeMapPda } from "../../../src/pda";
import { getConnection, getWallets } from "../../shared";

describe("getCustomTokenFees()", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const wallets = getWallets(network);
	console.log("wallets:", wallets);

	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider()
		.setProgram()
		.build();

	it("fetch custom token fees", async () => {
		const reloadablePda = deriveReloadableCardPda(service.program.programId);
		console.log("reloadablePda:", reloadablePda.toString());

		const customFeeMapPda = deriveTokenFeeMapPda(service.program.programId);
		console.log("token-fee map pda:", customFeeMapPda.toString());

		const customFees = await service.getCustomTokenFees();

		console.log(
			"fees",
			customFees.filter((r) => r.tokenAddress.toString() === reloadablePda.toString()),
		);
	});
});
