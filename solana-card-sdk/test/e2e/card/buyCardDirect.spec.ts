import dotenv from "dotenv";

// import { describe, it } from "mocha";
import { hashSHA256 } from "@zebec-network/core-utils";

import {
	BuyCardDirectParams,
	CardType,
	createAnchorProvider,
	parseDecimalString,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getConnection, getTxUrl, getWallets } from "../../shared";

dotenv.config();
describe("buyCardDirect", () => {
	const network = "devnet";
	const wallet = getWallets(network)[1];
	console.log("wallet:", wallet.publicKey.toString());
	const connection = getConnection(network);
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(createAnchorProvider(connection, wallet))
		.setProgram()
		.build();

	const buyerAddress = wallet.publicKey.toString();

	// before(async () => {
	// 	const params: DepositParams = {
	// 		amount,
	// 		mintAddress,
	// 		userAddress: buyerAddress,
	// 	};

	// 	await (await service.deposit(params)).execute({ commitment: "finalized" });
	// 	await sleep(5000);
	// });

	it("purchase card", async () => {
		const mintAddress = "De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc";
		// const mintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
		const amount = parseDecimalString("100");

		const cardType: CardType = "silver";
		const buyerEmail = await hashSHA256("ashishspkt6566@gmail.com");

		const nextBuyerCounter = await service.getNextBuyerCounter();
		console.debug("buyer counter", nextBuyerCounter);

		const params: BuyCardDirectParams = {
			amount,
			cardType,
			nextBuyerCounter,
			buyerAddress,
			mintAddress,
			buyerEmail,
		};
		const payload = await service.buyCardDirect(params);

		// const simulationResult = await payload.simulate();
		// console.log("simulation:", simulationResult);

		const signature = await payload.execute({
			commitment: "confirmed",
			preflightCommitment: "confirmed",
		});
		console.log("signature", getTxUrl(signature, network));
	});
});
