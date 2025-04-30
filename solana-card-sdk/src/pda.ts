import { Address, BN, translateAddress, utils, web3 } from "@coral-xyz/anchor";

import { CARD_PROGRAM_SEEDS } from "./constants";

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
