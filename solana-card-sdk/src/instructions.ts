import { BN, Program, web3 } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@zebec-network/solana-common";

import { ZebecCardIdl } from "./idl";

type CardType = "reloadable" | "non_reloadable";

/**
 * Data required while depositing
 */
export type DepositInstructionData = {
	amount: BN;
	sourceTokenAddress?: web3.PublicKey;
};

export type ParsedFeeTier = {
	minAmount: BN;
	maxAmount: BN;
	fee: BN;
};

export type ParsedTokenFeeStruct = {
	tokenAddress: web3.PublicKey;
	fee: BN;
};
export type ParsedTokenFeeList = ParsedTokenFeeStruct[];

export type InitCardConfigInstructionData = {
	cardVault: web3.PublicKey;
	revenueVault: web3.PublicKey;
	commissionVault: web3.PublicKey;
	revenueFee: BN;
	nativeFee: BN;
	nonNativeFee: BN;
	maxCardAmount: BN;
	minCardAmount: BN;
	dailyCardPurchaseLimit: BN;
	feeTiers: ParsedFeeTier[];
};

export type SetCardConfigInstructionData = {
	newZicOwner: web3.PublicKey;
	cardVault: web3.PublicKey;
	revenueVault: web3.PublicKey;
	commissionVault: web3.PublicKey;
	revenueFee: BN;
	nativeFee: BN;
	nonNativeFee: BN;
	maxCardAmount: BN;
	minCardAmount: BN;
	dailyCardPurchaseLimit: BN;
	feeTiers: ParsedFeeTier[];
};

export type BuyCardDirectInstructionData = {
	amount: BN;
	cardType: CardType;
	index: BN;
	sourceTokenAddress?: web3.PublicKey;
};

export type BuyCardBotInstructionData = {
	amount: BN;
	sourceTokenAddress: web3.PublicKey;
	userId: string;
	cardType: CardType;
};

export type InitBotConfigData = {
	botAdmin: web3.PublicKey;
};

export type IntiBotPdaData = {
	userId: string;
};

export type SetBotAdminData = {
	newAdmin: web3.PublicKey;
};

export type ParsedCardConfigInfo = {
	index: BN;
	zicOwner: web3.PublicKey;
	nativeFee: BN;
	nonNativeFee: BN;
	revenueFee: BN;
	usdcMint: web3.PublicKey;
	revenueVault: web3.PublicKey;
	commissionVault: web3.PublicKey;
	cardVault: web3.PublicKey;
	totalBought: BN;
	dailyCardBuyLimit: BN;
	providerConfig: ParsedProviderConfig;
};

export type ParsedProviderConfig = {
	minCardAmount: BN;
	maxCardAmount: BN;
	feeTiers: {
		tiers: ParsedFeeTier[];
	};
};

export type IntiOnRampUserCustodyData = {
	userId: string;
};

export type InitOnRampInstructionData = {
	admin: web3.PublicKey;
	zbcnToken: web3.PublicKey;
};

export type SetOnRampAdminInstructionData = {
	newAdmin: web3.PublicKey;
};

export type OnRampTransferZbcnInstructionData = {
	amount: BN;
	userId: string;
};
/**
 * Zebec Card Instruction Factory
 */
export class ZebecCardInstructions {
	constructor(readonly cardProgram: Program<ZebecCardIdl>) {}

	async getInitCardConfigsInstruction(
		cardPda: web3.PublicKey,
		usdcToken: web3.PublicKey,
		zicOwner: web3.PublicKey,
		data: InitCardConfigInstructionData,
	): Promise<web3.TransactionInstruction> {
		const {
			revenueFee,
			nativeFee,
			nonNativeFee,
			cardVault,
			revenueVault,
			commissionVault,
			maxCardAmount,
			minCardAmount,
			feeTiers,
			dailyCardPurchaseLimit,
		} = data;

		return this.cardProgram.methods
			.initCardConfigs({
				cardVault,
				commissionVault,
				nativeFee,
				nonNativeFee,
				revenueFee,
				revenueVault,
				maxCardAmount,
				minCardAmount,
				feeTier: feeTiers,
				dailyCardBuyLimit: dailyCardPurchaseLimit,
			})
			.accounts({
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				cardPda,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				usdcToken,
				zicOwner,
			})
			.instruction();
	}

	async getDepositInstruction(
		cardPda: web3.PublicKey,
		feeMapPda: web3.PublicKey,
		tokenMint: web3.PublicKey,
		user: web3.PublicKey,
		userAta: web3.PublicKey,
		userVault: web3.PublicKey,
		userVaultAta: web3.PublicKey,
		userPurchaseRecord: web3.PublicKey,
		revenueVault: web3.PublicKey,
		revenueVaultAta: web3.PublicKey,
		data: DepositInstructionData,
	): Promise<web3.TransactionInstruction> {
		const { amount, sourceTokenAddress } = data;

		return this.cardProgram.methods
			.deposit({
				amount,
				sourceTokenAddress: sourceTokenAddress ? sourceTokenAddress : tokenMint,
			})
			.accounts({
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				cardPda,
				feeMapPda,
				revenueVault,
				revenueVaultAta,
				systemProgram: web3.SystemProgram.programId,
				tokenMint,
				tokenProgram: TOKEN_PROGRAM_ID,
				user,
				userAta,
				userVault,
				userVaultAta,
				vaultPda: userPurchaseRecord,
			})
			.instruction();
	}

	async getSetCardConfigsInstruction(
		cardPda: web3.PublicKey,
		zicOwner: web3.PublicKey,
		data: SetCardConfigInstructionData,
	): Promise<web3.TransactionInstruction> {
		const {
			revenueFee,
			nativeFee,
			nonNativeFee,
			cardVault,
			revenueVault,
			commissionVault,
			feeTiers,
			maxCardAmount,
			minCardAmount,
			dailyCardPurchaseLimit,
			newZicOwner,
		} = data;

		return this.cardProgram.methods
			.setCardConfigs({
				zicOwner: newZicOwner,
				cardVault,
				commissionVault,
				revenueVault,
				nativeFee,
				nonNativeFee,
				revenueFee,
				maxCardAmount,
				minCardAmount,
				dailyCardBuyLimit: dailyCardPurchaseLimit,
				feeTier: feeTiers,
			})
			.accounts({
				cardPda,
				zicOwner,
			})
			.instruction();
	}

	async getBuyCardDirectInstruction(
		buyerPda: web3.PublicKey,
		cardPda: web3.PublicKey,
		cardVault: web3.PublicKey,
		cardVaultAta: web3.PublicKey,
		feeMapPda: web3.PublicKey,
		revenueVault: web3.PublicKey,
		revenueVaultAta: web3.PublicKey,
		usdcToken: web3.PublicKey,
		user: web3.PublicKey,
		userAta: web3.PublicKey,
		userPurchaseRecord: web3.PublicKey,
		buyCardData: BuyCardDirectInstructionData,
	) {
		const { amount, cardType, index, sourceTokenAddress } = buyCardData;

		return this.cardProgram.methods
			.buyCardDirect({
				amount,
				cardType,
				index,
				sourceTokenAddress: sourceTokenAddress ? sourceTokenAddress : usdcToken,
			})
			.accounts({
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				buyerPda,
				cardPda,
				cardVault,
				cardVaultAta,
				feeMapPda,
				revenueVault,
				revenueVaultAta,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				usdcToken,
				user,
				userAta,
				vaultPda: userPurchaseRecord,
			})
			.instruction();
	}

	async getSetCustomFeesInstruction(
		cardPda: web3.PublicKey,
		feeMapPda: web3.PublicKey,
		zicOwner: web3.PublicKey,
		tokenFeeList: ParsedTokenFeeList,
	) {
		return this.cardProgram.methods
			.setCustomFees(tokenFeeList)
			.accounts({
				cardPda,
				feeMapPda,
				systemProgram: web3.SystemProgram.programId,
				zicOwner,
			})
			.instruction();
	}

	async getDeleteCustomFeesInstruction(
		cardPda: web3.PublicKey,
		feeMapPda: web3.PublicKey,
		zicOwner: web3.PublicKey,
		tokenFeeList: web3.PublicKey[],
	) {
		return this.cardProgram.methods
			.deleteCustomFees(tokenFeeList)
			.accounts({
				cardPda,
				feeMapPda,
				systemProgram: web3.SystemProgram.programId,
				zicOwner,
			})
			.instruction();
	}

	// bot instructions

	async getInitBotConfigInstruction(
		cardBotConfig: web3.PublicKey,
		cardPda: web3.PublicKey,
		zicOwner: web3.PublicKey,
		data: InitBotConfigData,
	) {
		return this.cardProgram.methods
			.initBotConfig({
				botAdmin: data.botAdmin,
			})
			.accounts({
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				cardBotConfig,
				cardPda,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				zicOwner,
			})
			.instruction();
	}

	async getSetBotAdminInstruction(
		cardBotConfig: web3.PublicKey,
		cardPda: web3.PublicKey,
		zicOwner: web3.PublicKey,
		data: SetBotAdminData,
	) {
		return this.cardProgram.methods
			.setBotAdmin(data.newAdmin)
			.accounts({
				cardBotConfig,
				cardPda,
				zicOwner,
			})
			.instruction();
	}

	async getInitBotUserCustodyInstruction(
		botAdmin: web3.PublicKey,
		cardBotConfig: web3.PublicKey,
		usdcToken: web3.PublicKey,
		userCustody: web3.PublicKey,
		userCustodyAta: web3.PublicKey,
		data: IntiBotPdaData,
	) {
		return this.cardProgram.methods
			.initBotPda({ userId: data.userId })
			.accounts({
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				botAdmin,
				cardBotConfig,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				usdcToken,
				userCustody,
				userCustodyAta,
			})
			.instruction();
	}

	async getBuyCardBotInstruction(
		botAdmin: web3.PublicKey,
		cardBotConfig: web3.PublicKey,
		cardPda: web3.PublicKey,
		cardVault: web3.PublicKey,
		cardVaultAta: web3.PublicKey,
		feeMapPda: web3.PublicKey,
		revenueVault: web3.PublicKey,
		revenueVaultAta: web3.PublicKey,
		usdcToken: web3.PublicKey,
		userCustody: web3.PublicKey,
		userCustodyAta: web3.PublicKey,
		buyCardData: BuyCardBotInstructionData,
	) {
		const { amount, sourceTokenAddress, userId, cardType } = buyCardData;

		return this.cardProgram.methods
			.buyCardBot({ amount, sourceTokenAddress, userId, cardType })
			.accounts({
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				botAdmin,
				cardBotConfig,
				cardPda,
				cardVault,
				cardVaultAta,
				feeMapPda,
				revenueVault,
				revenueVaultAta,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				usdcToken,
				userCustody,
				userCustodyAta,
			})
			.instruction();
	}

	// on ramp instructions

	async getInitOnRampInstruction(
		zicOwner: web3.PublicKey,
		cardConfig: web3.PublicKey,
		onRampConfig: web3.PublicKey,
		data: InitOnRampInstructionData,
	) {
		const { admin, zbcnToken } = data;
		return this.cardProgram.methods
			.initOnRampConfig({ admin, zbcnToken })
			.accounts({
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				cardPda: cardConfig,
				onRampConfig,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				zicOwner,
			})
			.instruction();
	}

	async getInitOnRampUserCustodyInstruction(
		admin: web3.PublicKey,
		onRampConfig: web3.PublicKey,
		onRampUserCustody: web3.PublicKey,
		onRampUserCustodyZbcnAccount: web3.PublicKey,
		zbcnToken: web3.PublicKey,
		data: IntiOnRampUserCustodyData,
	) {
		return this.cardProgram.methods
			.initOnRampPda({
				userId: data.userId,
			})
			.accounts({
				admin,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				onRampConfig,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				userCustody: onRampUserCustody,
				userCustodyAta: onRampUserCustodyZbcnAccount,
				zbcnToken,
			})
			.instruction();
	}

	async getSetOnRampAdminInstruction(
		cardConfig: web3.PublicKey,
		onRampConfig: web3.PublicKey,
		zicOwner: web3.PublicKey,
		data: SetOnRampAdminInstructionData,
	) {
		return this.cardProgram.methods
			.setOnRampAdmin(data.newAdmin)
			.accounts({
				cardPda: cardConfig,
				onRampConfig,
				zicOwner,
			})
			.instruction();
	}

	async getOnRampTransferZbcnInstruction(
		onRampAdmin: web3.PublicKey,
		onRampConfig: web3.PublicKey,
		onRampUserCustody: web3.PublicKey,
		onRampUserCustodyZbcnAccount: web3.PublicKey,
		receiverAccount: web3.PublicKey,
		receiverZbcnAccount: web3.PublicKey,
		zbcnToken: web3.PublicKey,
		data: OnRampTransferZbcnInstructionData,
	) {
		const { amount, userId } = data;

		return this.cardProgram.methods
			.transferZbcn({ amount, userId })
			.accounts({
				admin: onRampAdmin,
				from: onRampUserCustody,
				fromAta: onRampUserCustodyZbcnAccount,
				onRampConfig,
				to: receiverAccount,
				toAta: receiverZbcnAccount,
				tokenProgram: TOKEN_PROGRAM_ID,
				zbcnToken,
			})
			.instruction();
	}
}
