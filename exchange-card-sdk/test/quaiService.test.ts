import { describe } from "mocha";

import { QuaiService } from "../src";
import {
	getQuaiProvider,
	getQuaiSigners,
} from "./setup";

const provider = getQuaiProvider();
const signers = getQuaiSigners(provider);
const signer = signers[0];

const service = new QuaiService(signer, {
	apiKey: process.env.API_KEY!,
	encryptionKey: process.env.ENCRYPTION_KEY!,
});

describe("QuaiService Tests", () => {
	it("should transfer quai", async () => {
		const receipt = await service.transferQuai({
			amount: 0.1,
		});

		console.log("Quai Transfer Receipt:", receipt?.hash);
	});
});
