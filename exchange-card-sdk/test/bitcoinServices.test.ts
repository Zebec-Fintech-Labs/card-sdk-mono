import * as bitcoin from "bitcoinjs-lib";
import { describe, it } from "mocha";

import { BitcoinService } from "../src/services/bitcoinService";

describe("Bitcoin Services", () => {
	describe("fetchUtxos", () => {
		it("should fetch UTXOs", async () => {
			const address = "tb1qzmya784lydryhyulxk4kpv9h49y5pjmfngc0m4";
			const mockWallet = {
				address,
				broadcastTransaction: async (tx: string) => tx,
				signTransaction: async (psbt: bitcoin.Psbt) => psbt,
			};
			const bitcoinService = new BitcoinService(mockWallet, {
				sandbox: true,
			});
			const utxos = await bitcoinService.getUTXOs();

			console.log("UTXOs: ", utxos);
		});
	});
});
