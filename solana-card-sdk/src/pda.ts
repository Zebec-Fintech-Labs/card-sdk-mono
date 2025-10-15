import { Address, BN, translateAddress, utils, web3 } from "@coral-xyz/anchor";

import { CARD_PROGRAM_SEEDS, ZEBEC_STAKE_PROGRAM } from "./constants";

export function deriveCardConfigPda(cardProgramId: Address) {
	const programId = translateAddress(cardProgramId);

	const [cardConfig] = web3.PublicKey.findProgramAddressSync(
		[Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.cardPdaSeed))],
		programId,
	);

	return cardConfig;
}

export function deriveTokenFeeMapPda(cardProgramId: Address) {
	const programId = translateAddress(cardProgramId);

	const [feeMapPda] = web3.PublicKey.findProgramAddressSync(
		[Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.feeMapPdaSeed))],
		programId,
	);

	return feeMapPda;
}

export function deriveCardPurchaseInfoPda(
	buyerAddress: Address,
	cardProgramId: Address,
	buyerCounter: bigint,
) {
	const buyer = translateAddress(buyerAddress);
	const programId = translateAddress(cardProgramId);

	const [buyerPda] = web3.PublicKey.findProgramAddressSync(
		[
			Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.buyerPdaSeed)),
			buyer.toBuffer(),
			new BN(buyerCounter.toString()).toArrayLike(Buffer, "le", 8),
		],
		programId,
	);

	return buyerPda;
}

export function deriveUserVaultPda(userAddress: Address, cardProgramId: Address) {
	const user = translateAddress(userAddress);
	const programId = translateAddress(cardProgramId);

	const [userVault] = web3.PublicKey.findProgramAddressSync(
		[Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.userPdaSeed)), user.toBuffer()],
		programId,
	);

	return userVault;
}

export function deriveUserPurchaseRecordPda(userAddress: Address, cardProgramId: Address) {
	const user = translateAddress(userAddress);
	const programId = translateAddress(cardProgramId);

	const [purchaseRecordPda] = web3.PublicKey.findProgramAddressSync(
		[Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.vaultInfoSeed)), user.toBuffer()],
		programId,
	);

	return purchaseRecordPda;
}

export function deriveCardBotConfigPda(cardProgramId: Address) {
	const programId = translateAddress(cardProgramId);

	const [cardBotConfigPda] = web3.PublicKey.findProgramAddressSync(
		[Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.cardBotPdaSeed))],
		programId,
	);

	return cardBotConfigPda;
}

export function deriveBotUserCustodyPda(userId: string, cardProgramId: Address) {
	const programId = translateAddress(cardProgramId);

	const [userCustodyPda] = web3.PublicKey.findProgramAddressSync(
		[Buffer.from(utils.bytes.utf8.encode(userId))],
		programId,
	);

	return userCustodyPda;
}

export function deriveOnRampConfigPda(cardProgramId: Address) {
	const programId = translateAddress(cardProgramId);

	const [onRampConfigPda] = web3.PublicKey.findProgramAddressSync(
		[Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.onRampConfigSeed))],
		programId,
	);

	return onRampConfigPda;
}

export function deriveOnRampUserCustodyPda(userId: string, cardProgramId: Address) {
	const programId = translateAddress(cardProgramId);

	const [onRampUserCustody] = web3.PublicKey.findProgramAddressSync(
		[
			Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.onRampUserCustodySeed)),
			Buffer.from(utils.bytes.utf8.encode(userId)),
		],
		programId,
	);

	return onRampUserCustody;
}

export function deriveReloadableCardPda(cardProgramId: Address) {
	const programId = translateAddress(cardProgramId);

	const [reloadableCardPda] = web3.PublicKey.findProgramAddressSync(
		[Buffer.from(utils.bytes.utf8.encode(CARD_PROGRAM_SEEDS.reloadAbleSeed))],
		programId,
	);

	return reloadableCardPda;
}

const STAKE_PROGRAM_SEEDS = {
	lockup: "zebec_lockup",
	stakeVault: "stake_vault",
	rewardVault: "reward_vault",
};

export function deriveStakeAddress(
	staker: Address,
	lockup: Address,
	nonce: bigint,
	programId: Address = ZEBEC_STAKE_PROGRAM["mainnet-beta"],
) {
	const [stakeAddress] = web3.PublicKey.findProgramAddressSync(
		[
			translateAddress(staker).toBuffer(),
			translateAddress(lockup).toBuffer(),
			new BN(nonce.toString()).toArrayLike(Buffer, "le", 8),
		],
		translateAddress(programId),
	);

	return stakeAddress;
}

export function deriveStakeLockupAddress(
	name: string,
	programId: Address = ZEBEC_STAKE_PROGRAM["mainnet-beta"],
) {
	const [lockupAddress] = web3.PublicKey.findProgramAddressSync(
		[utils.bytes.utf8.encode(STAKE_PROGRAM_SEEDS.lockup), utils.bytes.utf8.encode(name)],
		translateAddress(programId),
	);

	return lockupAddress;
}

export function deriveStakeUserNonceAddress(
	user: Address,
	lockup: Address,
	programId: Address = ZEBEC_STAKE_PROGRAM["mainnet-beta"],
) {
	const [userNonceAddress] = web3.PublicKey.findProgramAddressSync(
		[translateAddress(user).toBuffer(), translateAddress(lockup).toBuffer()],
		translateAddress(programId),
	);

	return userNonceAddress;
}

export function deriveStakeVaultAddress(
	lockup: Address,
	programId: Address = ZEBEC_STAKE_PROGRAM["mainnet-beta"],
) {
	const [stakeVault] = web3.PublicKey.findProgramAddressSync(
		[utils.bytes.utf8.encode(STAKE_PROGRAM_SEEDS.stakeVault), translateAddress(lockup).toBuffer()],
		translateAddress(programId),
	);

	return stakeVault;
}

export function deriveStakeRewardVaultAddress(
	lockup: Address,
	programId: Address = ZEBEC_STAKE_PROGRAM["mainnet-beta"],
) {
	const [rewardVault] = web3.PublicKey.findProgramAddressSync(
		[utils.bytes.utf8.encode(STAKE_PROGRAM_SEEDS.rewardVault), translateAddress(lockup).toBuffer()],
		translateAddress(programId),
	);

	return rewardVault;
}
