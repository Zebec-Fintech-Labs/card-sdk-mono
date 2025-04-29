import { describe } from "mocha";

import { CountryCode, Recipient, ZebecCardService } from "../src";
import { getProvider, getSigners } from "./setup";

describe("purchaseCard()", () => {
	it("order card from that usdc", async () => {
		const provider = getProvider("sepolia");
		const signer = getSigners(provider)[0];
		console.log("user:", signer.address);

		const chainId = 11155111; // sepolia
		const apiKey = process.env.API_KEY!;
		const encryptionKey = process.env.ENCRYPTION_KEY!;

		const service = new ZebecCardService(
			signer,
			chainId,
			{
				apiKey,
				encryptionKey,
			},
			{
				sandbox: true, // set true for testing and dev environment
			},
		);

		const participantId = "JohnChamling";
		const firstName = "John";
		const lastName = "Chamling";
		const emailAddress = "ashishspkt6566@gmail.com";
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
		const [depositResponse, buyCardResponse, apiResponse] = await service.purchaseCard({
			amount,
			recipient,
			quote,
		});

		console.log("depositResponse:", depositResponse.hash);
		console.log("buyCardResponse:", buyCardResponse.hash);
		console.log("apiResponse:", apiResponse.data);
	});
});
