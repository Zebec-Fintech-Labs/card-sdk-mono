import assert from "assert";
import { Log, LogDescription } from "ethers";
import { describe } from "mocha";

import { SupportedChain, ZebecCard__factory } from "../src";
import { getProvider } from "./shared";

const chainId = SupportedChain.BscTestnet;
const provider = getProvider(chainId);
// const signer = getSigners(provider)[0];

function parseLogs(logs: readonly Log[]) {
	const zebecCardInterface = ZebecCard__factory.createInterface();
	return logs.map((l) => zebecCardInterface.parseLog(l)).filter(Boolean) as LogDescription[];
}

describe("Parse Event Logs:", () => {
	it("DeposoitedEvent", async () => {
		const hash = "0x787b49fe1d8896ab53ebe0b39828aa7f50d5c8c33521ca75bbcf071cec8306cb";
		const receipt = await provider.getTransactionReceipt(hash);

		assert(receipt, "Could not find receipt.");

		const zebecCardEvents = parseLogs(receipt.logs);

		const depositedEvent = zebecCardEvents.find((e) => e.name === "Deposited");

		assert(depositedEvent, "Could not find Deposited event");

		depositedEvent.args.map((arg, i) => console.log("arg %d: %o", i, arg));
	});

	it("WithdrawnEvent", async () => {
		const hash = "0x8c47840d3c3acc6a75253eb3150f616127f364a655b80b87f354a2a4ef2ca5ab"; // sepolia
		const receipt = await provider.getTransactionReceipt(hash);

		assert(receipt, "Could not find receipt.");

		const zebecCardEvents = parseLogs(receipt.logs);

		const withdrawnEvent = zebecCardEvents.find((e) => e.name === "Withdrawn");

		assert(withdrawnEvent, "Could not find Withdrawn event");

		withdrawnEvent.args.map((arg, i) => console.log("arg %d: %o", i, arg));
	});

	it("CardPurchasedEvent", async () => {
		// const hash = "0x8c47840d3c3acc6a75253eb3150f616127f364a655b80b87f354a2a4ef2ca5ab"; // sepolia
		const hash = "0x6fcfd34889ab1387667d83c3eea58b848479eb7067ac674eab8395769f527930"; // bsc testnet
		const receipt = await provider.getTransactionReceipt(hash);

		assert(receipt, "Could not find receipt.");

		const zebecCardEvents = parseLogs(receipt.logs);

		const cardPurchasedEvent = zebecCardEvents.find((e) => e.name === "CardPurchased");

		assert(cardPurchasedEvent, "Could not find CardPurchased event");

		cardPurchasedEvent.args.map((arg, i) => console.log("arg %d: %o", i, arg));
	});

	it("SwappedEvent", async () => {
		const hash = "";
		const receipt = await provider.getTransactionReceipt(hash);

		assert(receipt, "Could not find receipt.");

		const zebecCardEvents = parseLogs(receipt.logs);

		const swappedEvent = zebecCardEvents.find((e) => e.name === "Swapped");

		assert(swappedEvent, "Could not find Swapped event");

		swappedEvent.args.map((arg, i) => console.log("arg %d: %o", i, arg));
	});
});
