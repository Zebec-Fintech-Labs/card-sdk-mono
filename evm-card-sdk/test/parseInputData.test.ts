import { describe } from "mocha";

import { SupportedChain, ZebecCard__factory } from "../src";
import { getProvider } from "./shared";

const chainId = SupportedChain.BscTestnet;
const provider = getProvider(chainId);
// const signer = getSigners(provider)[0];

function decodeBuyCardDirectData(data: string) {
	const zebecCardInterface = ZebecCard__factory.createInterface();

	// Get the function fragment from the selector
	const functionFragment = zebecCardInterface.getFunction("buyCardDirect");

	// Decode using the found function
	return zebecCardInterface.decodeFunctionData(functionFragment, data);
}

describe("decodeBuyCardDirectData", () => {
	it("Parse Function Data:", async () => {
		const data =
			"0x71036a490000000000000000000000000000000000000000000000000000000000989680000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000a72656c6f616461626c6500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004030393166666433326637383562326462633937393531396233623238666630376631326338363039356166316261376239656130393031343465373736386137";
		const decoded = decodeBuyCardDirectData(data);
		console.log({ decoded });
	});
});
