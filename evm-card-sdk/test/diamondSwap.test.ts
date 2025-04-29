import { ethers } from "ethers";
import { describe } from "mocha";

import { SupportedChain } from "../src/constants";
import { getSigners } from "./shared";

describe("Diamond Swap", () => {
	const chainId = SupportedChain.Sepolia;

	const provider = new ethers.JsonRpcProvider("https://node.dioneprotocol.com/ext/bc/D/rpc");
	console.log("provider new: ", provider);
	const signer = getSigners(provider)[0];

	console.log("signer:", signer.address);
	it("Diamond swap", async () => {
		console.log("CHAIN ID: ", chainId);
		console.log("provider: ", provider);
		console.log("signer: ", signer);
		const abi = [
			"function swap(address sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address to)",
		];
		const amount = ethers.parseUnits("0.1", 18);
		const routerAddress = "0x255e600Ed993eD3F07d620693b6Bc94271CDAaf9";
		const wDion = "0xF21Cbaf7bD040D686Bd390957770D2ea652E4013";
		let contract = new ethers.Contract(routerAddress, abi, signer);

		const response = await contract.swap(signer.address, 0, amount, 0, 0, signer.address);

		console.log("response: ", response);
	});
});
