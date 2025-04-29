import { describe, it } from "mocha";

import { Recipient, StellarService } from "../src";
import { getStellarSigner } from "./setup";

describe("purchaseCard()", () => {
	// it("fetch quotes", async () => {
	// 	const quote = await service.fetchQuote(amount);
	// 	console.log("Quote:", quote);
	// });
	// it("should successfully order a card using XDB", async () => {
	// 	const signer = getStellarSigner();
	// 	const apiKey = process.env.API_KEY!;
	// 	const encryptionKey = process.env.ENCRYPTION_KEY!;
	// 	console.log("Signer Public Key:", signer.publicKey());
	// 	const service = new StellarService(
	// 		signer,
	// 		{
	// 			apiKey: apiKey,
	// 			encryptionKey: encryptionKey,
	// 		},
	// 		{
	// 			sandbox: true, // Set true for testing and dev environment
	// 		},
	// 	);
	// 	const participantId = "Sanjib";
	// 	const firstName = "Sanjib";
	// 	const lastName = "Acharya";
	// 	const emailAddress = "sanjib@zebec.io";
	// 	const mobilePhone = "+9779876543210";
	// 	const language = "en-US";
	// 	const city = "Bharatpur";
	// 	const state = "Bagmati";
	// 	const postalCode = "44200";
	// 	const countryCode = "NPL";
	// 	const address1 = "Shittal street, Bharatpur - 10, Chitwan";
	// 	const amount = 1;
	// 	const recipient = Recipient.create(
	// 		participantId,
	// 		firstName,
	// 		lastName,
	// 		emailAddress,
	// 		mobilePhone,
	// 		language,
	// 		city,
	// 		state,
	// 		postalCode,
	// 		countryCode,
	// 		address1,
	// 	);
	// 	// const quote = await service.fetchQuote();
	// 	// console.log("Quote:", quote);
	// 	try {
	// 		const tx_hash = await service.transferXLM(amount);
	// 		console.log("Deposit Response:", tx_hash);
	// 	} catch (e: any) {
	// 		// console.log("e:", e);
	// 		console.log("data ==>", e.response);
	// 		console.log("extras ==>", e.response.data.extras.result_codes);
	// 		// throw e;
	// 	}
	// });
});
