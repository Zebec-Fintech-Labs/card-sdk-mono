// import { describe, it } from "mocha";

import {
	createAnchorProvider,
	deriveOnRampUserCustodyPda,
	deriveStakeLockupAddress,
	deriveStakeUserNonceAddress,
	OnRampServiceBuilder,
	OnRampStakeZbcnParams,
	parseDecimalString,
	parsePublicKeyString,
} from "../../../src";
import { getConnection, getWallets, sleep } from "../../shared";

describe("onRampStakeZbcn()", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const wallet = getWallets(network)[4];
	const provider = createAnchorProvider(connection, wallet);

	const service = new OnRampServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	const lockupName = "Lockup 002";
	const senderUserId = "0003";
	const onRampAdminAddress = parsePublicKeyString(provider.publicKey.toString());
	let nonce: bigint = BigInt(0);

	before(async () => {
		const lockup = deriveStakeLockupAddress(lockupName, service.stakeProgramId);
		const staker = deriveOnRampUserCustodyPda(senderUserId, service.onRampProgram.programId);
		const userNonce = deriveStakeUserNonceAddress(staker, lockup, service.stakeProgramId);
		const nonceInfo = await service.getUserNonceInfo(userNonce);
		nonce = nonceInfo ? nonceInfo.nonce : BigInt(0);
		console.log("nonce:", nonce);
	});

	it("stake zbcn for on ramp", async () => {
		const amount = parseDecimalString(100);
		const durationInSeconds = 30;

		const params: OnRampStakeZbcnParams = {
			amount,
			durationInSeconds,
			lockupName,
			nonce,
			onRampAdminAddress,
			senderUserId,
		};

		const payload = await service.onRampStakeZbcn(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});

	it("unstake zbcn for on ramp", async () => {
		await sleep(30000); // wait for stakes to mature before unstaking

		const feeVaultAddress = parsePublicKeyString("AA8B8zv68QCT8pkJL9vd6nAG9MzopARH9xvY1CLgAQQQ");
		const params = {
			lockupName,
			onRampAdminAddress,
			senderUserId,
			feeVaultAddress,
			nonce,
		};

		const payload = await service.onRampUnstakeZbcn(params);

		const signature = await payload.execute({
			preflightCommitment: "confirmed",
			commitment: "confirmed",
		});
		console.log("signature", signature);
	});
});
