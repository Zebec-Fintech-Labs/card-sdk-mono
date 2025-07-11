import dotenv from "dotenv";

// import { describe, it } from "mocha";
import { hashSHA256 } from "@zebec-network/core-utils";

import {
	CardType,
	createAnchorProvider,
	parseDecimalString,
	parsePercentString,
	SwapAndBuyCardDirectParams,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

dotenv.config();
describe("swapAndBuyCardDirect", () => {
	const network = "mainnet-beta";
	const wallets = getWallets(network);
	console.log(
		"wallets:",
		wallets.map((w) => w.publicKey.toString()),
	);
	const wallet = wallets[1];
	const connection = getConnection(network);
	const provider = createAnchorProvider(connection, wallet);

	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	const buyerAddress = provider.publicKey.toString();
	// const mintAddress = "De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc";
	const amount = "5000";

	// before(async () => {
	// 	const params: DepositParams = {
	// 		amount,
	// 		mintAddress,
	// 		userAddress: buyerAddress,
	// 	};

	// 	await (await service.deposit(params)).execute({ commitment: "finalized" });
	// 	await sleep(5000);
	// });

	it("transfer usdc from user vault to card vault", async () => {
		const cardType: CardType = "carbon";
		const buyerEmail = await hashSHA256("ashishspkt6566@gmail.com");
		const inputMintAddress = "ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU";
		const outputMintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
		const inputAmount = parseDecimalString("5300");
		const slippagePercent = parsePercentString("0.01");

		const quoteInfo = await service.getQuoteInfo({
			inputAmount,
			inputMintAddress,
			outputMintAddress,
			slippagePercent,
			swapMode: "ExactIn",
		});

		console.log("quoteInfo", quoteInfo);

		const nextBuyerCounter = await service.getNextBuyerCounter();
		console.debug("buyer counter", nextBuyerCounter);

		const params: SwapAndBuyCardDirectParams = {
			quoteInfo,
			buyerAddress,
			cardType,
			nextBuyerCounter,
			buyerEmail,
		};

		const payload = await service.swapAndBuyCardDirect(params);

		const result = await payload.simulate({ commitment: "confirmed" });

		console.log("result", result);

		// const signature = await payload.execute({
		// commitment: "confirmed",
		// preflightCommitment: "confirmed",
		// });
		// console.log("signature", signature);
	});
});
