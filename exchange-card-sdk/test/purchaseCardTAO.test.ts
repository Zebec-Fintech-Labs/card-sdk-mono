import { describe } from "mocha";

import { CountryCode, Recipient, ZebecCardTAOService } from "../src";
import { getTAOSigner } from "./setup";

describe("purchaseCard()", () => {
	it("order card from tao", async () => {
		const signer = getTAOSigner();
		const apiKey = process.env.API_KEY!;
		const encryptionKey = process.env.ENCRYPTION_KEY!;

		console.log("signer:", signer.address);

		const service = new ZebecCardTAOService(
			signer,
			{
				apiKey: apiKey,
				encryptionKey: encryptionKey,
			},
			{
				sandbox: false, // set true for testing and dev environment
			},
		);

		const participantId = "Sanjib";
		const firstName = "Sanjib";
		const lastName = "Acharya";
		const emailAddress = "sanjib@zebec.io";
		const mobilePhone = "+9779876543210";
		const language = "en-US";
		const city = "Bharatpur";
		const state = "Bagmati";
		const postalCode = "44200";
		const countryCode: CountryCode = "NPL";
		const address1 = "Shittal street, Bharatpur - 10, Chitwan";

		const amount = "5";
		const recipient = Recipient.create(
			participantId,
			firstName,
			lastName,
			emailAddress,
			mobilePhone,
			language,
			city,
			state,
			postalCode,
			countryCode,
			address1,
		);

		const quote = await service.fetchQuote(amount);
		console.log("quote:", quote);
		const [depositResponse, apiResponse] = await service.purchaseCard({
			walletAddress: signer.address,
			amount,
			recipient,
			quote: quote,
		});

		console.log("depositResponse:", depositResponse);
		console.log("apiResponse:", apiResponse.data);
	});
});
