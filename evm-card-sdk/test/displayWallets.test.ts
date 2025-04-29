import { describe } from "mocha";

import { SupportedChain } from "../src";
import { getProvider, getSigners } from "./shared";

const chainId = SupportedChain.Sepolia;
const provider = getProvider(chainId);
const signers = getSigners(provider);

describe("wallets", () => {
	it("displays wallet addresses", async () => {
		console.log(
			"signers:",
			signers.map((s) => s.address),
		);
	});
});
