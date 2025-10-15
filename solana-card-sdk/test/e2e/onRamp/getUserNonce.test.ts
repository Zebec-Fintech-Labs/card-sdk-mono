// import { describe, it } from "mocha";

import { Program } from "@coral-xyz/anchor";

import {
	deriveStakeLockupAddress,
	deriveStakeUserNonceAddress,
	OnRampServiceBuilder,
	ZEBEC_CARD_IDL,
	ZEBEC_CARD_PROGRAM,
} from "../../../src";
import { getWallets } from "../../shared";

describe("getUserNonceInfo", () => {
	const network = "devnet";
	const wallets = getWallets(network);
	console.log("wallets:", wallets);
	const wallet = wallets[2];

	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider()
		.setProgram((provider) => new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[network], provider))
		.build();

	it("fetch user nonce:", async () => {
		const lockupName = "Lockup 002";
		const lockup = deriveStakeLockupAddress(lockupName, service.stakeProgramId);
		const userNonce = deriveStakeUserNonceAddress(wallet.publicKey, lockup, service.stakeProgramId);
		const info = await service.getUserNonceInfo(userNonce);

		console.log("info", info);
	});
});
