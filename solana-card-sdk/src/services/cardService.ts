import { BigNumber } from "bignumber.js";
import { Buffer } from "buffer";

import { Address, AnchorProvider, BN, Program, translateAddress, web3 } from "@coral-xyz/anchor";
import { areDatesOfSameDay, bpsToPercent, percentToBps } from "@zebec-network/core-utils";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	createAssociatedTokenAccountInstruction,
	getAssociatedTokenAddressSync,
	getMintDecimals,
	MEMO_PROGRAM_ID,
	SignTransactionFunction,
	TEN_BIGNUM,
	TOKEN_PROGRAM_ID,
	TransactionPayload,
	UNITS_PER_USDC,
	WSOL,
} from "@zebec-network/solana-common";

import { CARD_LOOKUP_TABLE_ADDRESS, JUP_SWAP_API, ZEBEC_CARD_PROGRAM } from "../constants";
import {
	AmountOutOfRangeError,
	AssociatedTokenAccountDoesNotExistsError,
	DailyCardLimitReachedError,
	InvalidUsdcAddressError,
	NotEnoughBalanceError,
	QuoteResponseError,
} from "../errors";
import { ZEBEC_CARD_IDL, ZebecCardIdl } from "../idl";
import {
	deriveCardConfigPda,
	deriveCardPurchaseInfoPda,
	deriveTokenFeeMapPda,
	deriveUserPurchaseRecordPda,
} from "../pda";
import { createReadonlyProvider, ReadonlyProvider } from "../provider";
import {
	BigIntString,
	CardType,
	DecimalString,
	InstructionCardType,
	ParsedCardConfigInfo,
	parseDecimalString,
	ParsedFeeTier,
	ParsedTokenFeeList,
	ParsedTokenFeeStruct,
	parsePercentString,
	parsePublicKeyString,
	PercentString,
	PublicKeyString,
} from "../types";
import { parseQuoteInfo, sortFeeTierDesc } from "../utils";

type ProgramCreateFunction = (provider: ReadonlyProvider | AnchorProvider) => Program<ZebecCardIdl>;

/**
 * ZebecCardServiceBuilder is a builder class for creating a ZebecCardService instance.
 * It allows you to set the network, provider and program used to build service.
 */
export class ZebecCardServiceBuilder {
	private _program: Program<ZebecCardIdl> | undefined;
	private _provider: ReadonlyProvider | AnchorProvider | undefined;
	private _network: "mainnet-beta" | "devnet" | undefined;

	/**
	 *
	 * @param network The network to use. If not set, a default network: 'mainnet-beta' will be used.
	 * @returns
	 */
	setNetwork(network?: "mainnet-beta" | "devnet"): ZebecCardServiceBuilder {
		if (this._network) {
			throw new Error("InvalidOperation: Network is set twice.");
		}

		this._network = network ? network : "mainnet-beta";

		return this;
	}

	/**
	 * Set the provider to use. If not set, a default provider will be created.
	 * @param provider The provider to use. If not set, a default provider: 'ReadonlyProvider' will be created.
	 * @returns The StakeServiceBuilder instance.
	 */
	setProvider(provider?: ReadonlyProvider | AnchorProvider): ZebecCardServiceBuilder {
		if (this._provider) {
			throw new Error("InvalidOperation: Provider is set twice.");
		}

		if (!this._network) {
			throw new Error(
				"InvalidOperation: Network is not set. Please set the network before setting the provider.",
			);
		}

		if (provider) {
			this.validateProviderNetwork(provider, this._network);

			this._provider = provider;
		} else {
			this._provider = createReadonlyProvider(
				new web3.Connection(web3.clusterApiUrl(this._network)),
			);
		}

		return this;
	}

	/**
	 *
	 * @param provider The provider to compare with.
	 */
	private validateProviderNetwork(provider: ReadonlyProvider | AnchorProvider, network: string) {
		const connection = provider.connection;
		const rpcEndpoint = connection.rpcEndpoint;
		const connNetwork = rpcEndpoint.includes("devnet")
			? "devnet"
			: rpcEndpoint.includes("testnet")
				? "testnet"
				: "mainnet-beta";

		if (connNetwork === "testnet") {
			throw new Error(
				"InvalidOperation: Testnet is not supported. Please use connection with devnet or mainnet-beta network.",
			);
		}

		if (network !== connNetwork) {
			throw new Error(
				`InvalidOperation: Network mismatch. network and connection network should be same. network: ${this._network}, connection: ${connNetwork}`,
			);
		}
	}

	/**
	 * Set the program to use. If not set, a default program will be created.
	 * @param program The program to use. If not set, a default program will be created.
	 * @returns The StakeServiceBuilder instance.
	 */
	setProgram(createProgram?: ProgramCreateFunction): ZebecCardServiceBuilder {
		if (this._program) {
			throw new Error("InvalidOperation: Program is set twice.");
		}

		if (!this._network) {
			throw new Error(
				"InvalidOperation: Network is not set. Please set the network before setting the provider.",
			);
		}

		if (!this._provider) {
			throw new Error(
				"InvalidOperation: Provider is not set. Please set the provider before setting the program.",
			);
		}

		this._program = !createProgram
			? new Program(ZEBEC_CARD_IDL, ZEBEC_CARD_PROGRAM[this._network], this._provider)
			: createProgram(this._provider);

		return this;
	}

	build(): ZebecCardService {
		if (!this._network) {
			throw new Error(
				"InvalidOperation: Network is not set. Please set the network before building the service.",
			);
		}

		if (!this._provider) {
			throw new Error(
				"InvalidOperation: Provider is not set. Please set the provider before building the service.",
			);
		}

		if (!this._program) {
			throw new Error(
				"InvalidOperation: Program is not set. Please set the program before building the service.",
			);
		}

		return new ZebecCardService(this._provider, this._program);
	}
}

/**
 * Jupiter quote routes info
 */
export type RouteInfo = {
	swapInfo: {
		ammKey: PublicKeyString;
		label: string;
		inputMint: PublicKeyString;
		outputMint: PublicKeyString;
		inAmount: BigIntString;
		outAmount: BigIntString;
		feeAmount: BigIntString;
		feeMint: PublicKeyString;
	};
	percent: number;
};

/**
 * Juptier quote info
 */
export type QuoteInfo =
	| {
			inputMint: PublicKeyString;
			inAmount: BigIntString;
			outputMint: PublicKeyString;
			outAmount: BigIntString;
			otherAmountThreshold: BigIntString;
			swapMode: "ExactIn" | "ExactOut";
			slippageBps: number;
			platformFee: string | null;
			priceImpactPct: PercentString;
			routePlan: RouteInfo[];
			contextSlot: number;
			timeTaken: number;
	  }
	| {
			error: string;
	  };

/**
 * Info stored in buyerPda
 */
export type CardPurchaseInfo = {
	address: PublicKeyString;
	index: bigint;
	buyerAddress: PublicKeyString;
	amount: DecimalString;
	purchaseAt: number;
};

export type FeeTier = {
	minAmount: DecimalString;
	maxAmount: DecimalString;
	feePercent: PercentString;
};

export type ProviderConfig = {
	minCardAmount: DecimalString;
	maxCardAmount: DecimalString;
	feeTiers: FeeTier[];
};

/**
 * Info stored in cardPda
 */
export type CardConfigInfo = {
	address: PublicKeyString;
	index: bigint;
	zicOwner: PublicKeyString;
	nativeFeePercent: PercentString;
	nonNativeFeePercent: PercentString;
	revenueFeePercent: PercentString;
	usdcMint: PublicKeyString;
	revenueVault: PublicKeyString;
	commissionVault: PublicKeyString;
	cardVault: PublicKeyString;
	totalCardSold: DecimalString;
	providerConfig: ProviderConfig;
	dailyCardPurchaseLimit: DecimalString;
};

export type TokenFeeRecord = {
	tokenAddress: PublicKeyString;
	fee: PercentString;
};

export type TokenFeeRecordList = TokenFeeRecord[];

export type UserPurchaseRecordInfo = {
	address: PublicKeyString;
	owner: PublicKeyString;
	lastCardBoughtTimestamp: number;
	totalCardBoughtPerDay: DecimalString;
};

export type InitCardConfigParams = {
	zicOwnerAddress: Address;
	cardVaultAddress: Address;
	revenueVaultAddress: Address;
	commissionVaultAddress: Address;
	usdcAddress: Address;
	revenueFeePercent: PercentString;
	nativeFeePercent: PercentString;
	nonNativeFeePercent: PercentString;
	minCardAmount: DecimalString;
	maxCardAmount: DecimalString;
	dailyCardPurchaseLimit: DecimalString;
	feeTiers: Array<FeeTier>;
};

export type SetCardConfigParams = {
	zicOwnerAddress: Address;
	newZicOwnerAddress: Address;
	cardVaultAddress: Address;
	revenueVaultAddress: Address;
	commissionVaultAddress: Address;
	revenueFeePercent: PercentString;
	nativeFeePercent: PercentString;
	nonNativeFeePercent: PercentString;
	minCardAmount: DecimalString;
	maxCardAmount: DecimalString;
	dailyCardPurchaseLimit: DecimalString;
	feeTiers: Array<FeeTier>;
};

export type SetCustomFeesParams = {
	zicOwnerAddress: PublicKeyString;
	tokenFeeList: TokenFeeRecordList;
};

export type DeleteCustomFeesParams = {
	zicOwnerAddress: PublicKeyString;
	tokenAddressList: PublicKeyString[];
};

export type SwapMode = "ExactOut" | "ExactIn";

export type BuyCardDirectParams = {
	buyerAddress: Address;
	nextBuyerCounter: bigint;
	amount: DecimalString;
	cardType: CardType;
	buyerEmail: string;
	mintAddress: Address;
};

export type SwapAndBuyCardDirectParams = {
	quoteInfo: QuoteInfo;
	buyerAddress: Address;
	nextBuyerCounter: bigint;
	cardType: CardType;
	buyerEmail: string;
};

export type GetQuoteInfoParams = {
	inputMintAddress: Address;
	outputMintAddress: Address;
	inputAmount: DecimalString;
	slippagePercent: PercentString;
	swapMode?: SwapMode;
};

export type CardPurchaseEvent = {
	index: bigint;
	from: PublicKeyString;
	to: PublicKeyString;
	amount: DecimalString;
};

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
	cardType: InstructionCardType;
	index: BN;
	sourceTokenAddress?: web3.PublicKey;
};

export class ZebecCardService {
	constructor(
		readonly provider: ReadonlyProvider | AnchorProvider,
		readonly program: Program<ZebecCardIdl>,
	) {}

	private async _createPayload(
		payerKey: web3.PublicKey,
		instructions: web3.TransactionInstruction[],
		signers?: web3.Signer[],
		addressLookupTableAccounts?: web3.AddressLookupTableAccount[],
	): Promise<TransactionPayload> {
		const errorMap: Map<number, string> = new Map();
		this.program.idl.errors.forEach((error) => errorMap.set(error.code, error.msg));

		const provider = this.provider;

		let signTransaction: SignTransactionFunction | undefined;

		if (provider instanceof AnchorProvider) {
			signTransaction = async (tx) => {
				return provider.wallet.signTransaction(tx);
			};
		}

		return new TransactionPayload(
			this.provider.connection,
			errorMap,
			instructions,
			payerKey,
			signers,
			addressLookupTableAccounts,
			signTransaction,
		);
	}

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

		return this.program.methods
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

		return this.program.methods
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

		return this.program.methods
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
		return this.program.methods
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
		return this.program.methods
			.deleteCustomFees(tokenFeeList)
			.accounts({
				cardPda,
				feeMapPda,
				systemProgram: web3.SystemProgram.programId,
				zicOwner,
			})
			.instruction();
	}

	async initCardConfig(params: InitCardConfigParams): Promise<TransactionPayload> {
		const {
			zicOwnerAddress,
			cardVaultAddress,
			revenueVaultAddress,
			commissionVaultAddress,
			usdcAddress,
		} = params;
		const zicOwner = translateAddress(zicOwnerAddress);
		const usdcToken = translateAddress(usdcAddress);
		const cardVault = translateAddress(cardVaultAddress);
		const revenueVault = translateAddress(revenueVaultAddress);
		const commissionVault = translateAddress(commissionVaultAddress);
		const cardConfig = deriveCardConfigPda(this.program.programId);

		const nativeFee = new BN(percentToBps(params.nativeFeePercent));
		const nonNativeFee = new BN(percentToBps(params.nonNativeFeePercent));
		const revenueFee = new BN(percentToBps(params.revenueFeePercent));

		const maxCardAmount = new BN(BigNumber(params.maxCardAmount).times(UNITS_PER_USDC).toFixed(0));
		const minCardAmount = new BN(BigNumber(params.minCardAmount).times(UNITS_PER_USDC).toFixed(0));
		const dailyCardPurchaseLimit = new BN(
			BigNumber(params.dailyCardPurchaseLimit).times(UNITS_PER_USDC).toFixed(0),
		);

		const feeTiers = params.feeTiers.map<ParsedFeeTier>((feeTier) => {
			const minAmount = new BN(BigNumber(feeTier.minAmount).times(UNITS_PER_USDC).toFixed(0));
			const maxAmount = new BN(BigNumber(feeTier.maxAmount).times(UNITS_PER_USDC).toFixed(0));
			const fee = new BN(percentToBps(feeTier.feePercent));

			return {
				minAmount,
				maxAmount,
				fee,
			};
		});

		sortFeeTierDesc(feeTiers);

		const ixs = [];
		const ix = await this.getInitCardConfigsInstruction(cardConfig, usdcToken, zicOwner, {
			revenueVault,
			cardVault,
			commissionVault,
			nativeFee,
			nonNativeFee,
			revenueFee,
			feeTiers,
			maxCardAmount,
			minCardAmount,
			dailyCardPurchaseLimit,
		});

		ixs.push(ix);

		const cardVaultUsdcAccount = getAssociatedTokenAddressSync(usdcToken, cardVault, true);
		const cardVaultUsdcAccountInfo = await this.provider.connection.getAccountInfo(
			cardVaultUsdcAccount,
			"confirmed",
		);
		if (!cardVaultUsdcAccountInfo) {
			ixs.push(
				createAssociatedTokenAccountInstruction(
					zicOwner,
					cardVaultUsdcAccount,
					cardVault,
					usdcToken,
				),
			);
		}

		if (!revenueVault.equals(cardVault)) {
			const revenueVaultUsdcAccount = getAssociatedTokenAddressSync(usdcToken, revenueVault, true);
			const revenueVaultUsdcAccountInfo = await this.provider.connection.getAccountInfo(
				revenueVaultUsdcAccount,
				"confirmed",
			);
			if (!revenueVaultUsdcAccountInfo) {
				ixs.push(
					createAssociatedTokenAccountInstruction(
						zicOwner,
						revenueVaultUsdcAccount,
						revenueVault,
						usdcToken,
					),
				);
			}
		}

		if (!commissionVault.equals(revenueVault) && !commissionVault.equals(cardVault)) {
			const commissionVaultUsdcAccount = getAssociatedTokenAddressSync(
				usdcToken,
				commissionVault,
				true,
			);
			const commissionVaultUsdcAccountInfo = await this.provider.connection.getAccountInfo(
				commissionVaultUsdcAccount,
				"confirmed",
			);
			if (!commissionVaultUsdcAccountInfo) {
				ixs.push(
					createAssociatedTokenAccountInstruction(
						zicOwner,
						commissionVaultUsdcAccount,
						commissionVault,
						usdcToken,
					),
				);
			}
		}

		const payload = await this._createPayload(zicOwner, ixs, []);

		return payload;
	}

	async setCardConfig(params: SetCardConfigParams) {
		const {
			zicOwnerAddress,
			newZicOwnerAddress,
			cardVaultAddress,
			revenueVaultAddress,
			commissionVaultAddress,
		} = params;
		const zicOwner = translateAddress(zicOwnerAddress);
		const newZicOwner = translateAddress(newZicOwnerAddress);
		const cardVault = translateAddress(cardVaultAddress);
		const revenueVault = translateAddress(revenueVaultAddress);
		const commissionVault = translateAddress(commissionVaultAddress);

		const cardConfig = deriveCardConfigPda(this.program.programId);

		const cardConfigInfo = await this.program.account.card.fetch(cardConfig, "confirmed");

		if (!zicOwner.equals(cardConfigInfo.zicOwner)) {
			throw new Error("Invalid owner of the config.");
		}

		const usdcToken = cardConfigInfo.usdcMint;
		const nativeFee = new BN(percentToBps(params.nativeFeePercent));
		const nonNativeFee = new BN(percentToBps(params.nonNativeFeePercent));
		const revenueFee = new BN(percentToBps(params.revenueFeePercent));

		const maxCardAmount = new BN(BigNumber(params.maxCardAmount).times(UNITS_PER_USDC).toFixed(0));
		const minCardAmount = new BN(BigNumber(params.minCardAmount).times(UNITS_PER_USDC).toFixed(0));
		const dailyCardPurchaseLimit = new BN(
			BigNumber(params.dailyCardPurchaseLimit).times(UNITS_PER_USDC).toFixed(0),
		);

		const feeTiers = params.feeTiers.map<ParsedFeeTier>((feeTier) => {
			const minAmount = new BN(BigNumber(feeTier.minAmount).times(UNITS_PER_USDC).toFixed(0));
			const maxAmount = new BN(BigNumber(feeTier.maxAmount).times(UNITS_PER_USDC).toFixed(0));
			const fee = new BN(percentToBps(feeTier.feePercent));

			return {
				minAmount,
				maxAmount,
				fee,
			};
		});

		sortFeeTierDesc(feeTiers);

		const ixs = [];
		const ix = await this.getSetCardConfigsInstruction(cardConfig, zicOwner, {
			newZicOwner,
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
		});
		ixs.push(ix);

		const cardVaultUsdcAccount = getAssociatedTokenAddressSync(usdcToken, cardVault, true);
		const cardVaultUsdcAccountInfo = await this.provider.connection.getAccountInfo(
			cardVaultUsdcAccount,
			"confirmed",
		);
		if (!cardVaultUsdcAccountInfo) {
			ixs.push(
				createAssociatedTokenAccountInstruction(
					zicOwner,
					cardVaultUsdcAccount,
					cardVault,
					usdcToken,
				),
			);
		}

		if (!revenueVault.equals(cardVault)) {
			const revenueVaultUsdcAccount = getAssociatedTokenAddressSync(usdcToken, revenueVault, true);
			const revenueVaultUsdcAccountInfo = await this.provider.connection.getAccountInfo(
				revenueVaultUsdcAccount,
				"confirmed",
			);
			if (!revenueVaultUsdcAccountInfo) {
				ixs.push(
					createAssociatedTokenAccountInstruction(
						zicOwner,
						revenueVaultUsdcAccount,
						revenueVault,
						usdcToken,
					),
				);
			}
		}

		if (!commissionVault.equals(revenueVault) && !commissionVault.equals(cardVault)) {
			const commissionVaultUsdcAccount = getAssociatedTokenAddressSync(
				usdcToken,
				commissionVault,
				true,
			);
			const commissionVaultUsdcAccountInfo = await this.provider.connection.getAccountInfo(
				commissionVaultUsdcAccount,
				"confirmed",
			);
			if (!commissionVaultUsdcAccountInfo) {
				ixs.push(
					createAssociatedTokenAccountInstruction(
						zicOwner,
						commissionVaultUsdcAccount,
						commissionVault,
						usdcToken,
					),
				);
			}
		}

		const payload = await this._createPayload(zicOwner, ixs, []);

		return payload;
	}

	async setCustomFees(params: SetCustomFeesParams) {
		const zicOwner = translateAddress(params.zicOwnerAddress);
		const cardConfigPda = deriveCardConfigPda(this.program.programId);
		const tokenFeeMapPda = deriveTokenFeeMapPda(this.program.programId);

		const parsedTokenFeeList = params.tokenFeeList.map<ParsedTokenFeeStruct>((tokenFee) => ({
			tokenAddress: translateAddress(tokenFee.tokenAddress),
			fee: new BN(percentToBps(tokenFee.fee)),
		}));

		const ix = await this.getSetCustomFeesInstruction(
			cardConfigPda,
			tokenFeeMapPda,
			zicOwner,
			parsedTokenFeeList,
		);

		return this._createPayload(zicOwner, [ix], []);
	}

	async deleteCustomFees(params: DeleteCustomFeesParams) {
		const zicOwner = translateAddress(params.zicOwnerAddress);
		const cardConfigPda = deriveCardConfigPda(this.program.programId);
		const tokenFeeMapPda = deriveTokenFeeMapPda(this.program.programId);

		const tokenList = params.tokenAddressList.map((tokenAddress) => translateAddress(tokenAddress));

		const ix = await this.getDeleteCustomFeesInstruction(
			cardConfigPda,
			tokenFeeMapPda,
			zicOwner,
			tokenList,
		);

		return this._createPayload(zicOwner, [ix], []);
	}

	async swapAndBuyCardDirect(params: SwapAndBuyCardDirectParams) {
		const { buyerAddress, quoteInfo } = params;

		if ("error" in quoteInfo) {
			throw new QuoteResponseError(quoteInfo.error);
		}

		const cardConfig = deriveCardConfigPda(this.program.programId);
		const cardConfigInfo = await this.program.account.card.fetch(cardConfig, "confirmed");

		const buyer = translateAddress(buyerAddress);
		const inputMint = translateAddress(quoteInfo.inputMint);
		const usdc = translateAddress(quoteInfo.outputMint);
		const revenueVault = cardConfigInfo.revenueVault;
		const userPurchaseRecord = deriveUserPurchaseRecordPda(buyer, this.program.programId);
		const cardPurchaseInfoPda = deriveCardPurchaseInfoPda(
			buyer,
			this.program.programId,
			params.nextBuyerCounter,
		);
		const tokenFeeMapPda = deriveTokenFeeMapPda(this.program.programId);

		const cardVault = cardConfigInfo.cardVault;

		const cardVaultAta = getAssociatedTokenAddressSync(usdc, cardVault, true);
		const revenueVaultAta = getAssociatedTokenAddressSync(usdc, revenueVault, true);
		const buyerAta = getAssociatedTokenAddressSync(usdc, buyer);

		const amount =
			quoteInfo.swapMode === "ExactIn"
				? new BigNumber(quoteInfo.otherAmountThreshold)
				: new BigNumber(quoteInfo.outAmount);

		if (!usdc.equals(cardConfigInfo.usdcMint)) {
			throw new InvalidUsdcAddressError(usdc.toString());
		}

		const buyerInputMintAta = getAssociatedTokenAddressSync(inputMint, buyer);

		if (!inputMint.equals(WSOL)) {
			const buyerInputMintAtaInfo = await this.provider.connection.getAccountInfo(
				buyerInputMintAta,
				"confirmed",
			);

			if (!buyerInputMintAtaInfo) {
				throw new AssociatedTokenAccountDoesNotExistsError(
					"User doesn't have associated token account of input mint: " + inputMint.toString(),
				);
			}
		}

		// check if user has enough balance
		if (!inputMint.equals(WSOL)) {
			const resAndCtx = await this.provider.connection.getTokenAccountBalance(
				buyerInputMintAta,
				"confirmed",
			);
			const balance = resAndCtx.value.amount;
			if (balance === "" || BigNumber(balance).lt(quoteInfo.inAmount)) {
				throw new NotEnoughBalanceError("User doesn't have enough input mint balance");
			}
		} else {
			const balance = await this.provider.connection.getBalance(buyer, "confirmed");
			if (BigNumber(balance).lt(quoteInfo.inAmount)) {
				throw new NotEnoughBalanceError("User doesn't have enough SOL balance");
			}
		}

		const customTokenFees = await this.getCustomTokenFees();
		const customTokenFee = customTokenFees.find((tf) => tf.tokenAddress === quoteInfo.inputMint);

		const DEFAULT_SWAP_FEE = 5;
		const swapFee = customTokenFee ? BigNumber(customTokenFee.fee) : BigNumber(DEFAULT_SWAP_FEE);
		const amountAfterFeeDeduction = amount.minus(amount.times(swapFee.div(100)));

		this._checkAmountIsWithinProviderRange(cardConfigInfo, amountAfterFeeDeduction);

		await this._checkAmountIsWithinDailyCardLimit(
			cardConfigInfo,
			userPurchaseRecord,
			amountAfterFeeDeduction,
		);

		// get serialized transactions for the swap
		const { swapTransaction } = await (
			await fetch(JUP_SWAP_API, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					// quoteResponse from /quote api
					quoteResponse: quoteInfo,
					// user public key to be used for the swap
					userPublicKey: buyer.toString(),
					// auto wrap and unwrap SOL. default is true
					wrapAndUnwrapSol: true,
					// feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
					// feeAccount: "fee_account_public_key"
				}),
			})
		).json();

		// deserialize the transaction
		const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
		const transaction = web3.VersionedTransaction.deserialize(swapTransactionBuf);

		// get address lookup table accounts
		const addressLookupTableAccounts = await Promise.all(
			transaction.message.addressTableLookups.map(async (lookup) => {
				const data = await this.provider.connection
					.getAccountInfo(lookup.accountKey)
					.then((res) => res!.data);
				return new web3.AddressLookupTableAccount({
					key: lookup.accountKey,
					state: web3.AddressLookupTableAccount.deserialize(data),
				});
			}),
		);

		const lookupTableData = await this.provider.connection
			.getAccountInfo(translateAddress(CARD_LOOKUP_TABLE_ADDRESS))
			.then((res) => res!.data);

		addressLookupTableAccounts.push(
			new web3.AddressLookupTableAccount({
				key: translateAddress(CARD_LOOKUP_TABLE_ADDRESS),
				state: web3.AddressLookupTableAccount.deserialize(lookupTableData),
			}),
		);
		// console.log("address lookup table:\n", addressLookupTableAccounts);

		// decompile transaction message and add transfer instruction
		const message = web3.TransactionMessage.decompile(transaction.message, {
			addressLookupTableAccounts: addressLookupTableAccounts,
		});

		const instructions = message.instructions;

		const parsedAmount = new BN(amount.toFixed(0, BigNumber.ROUND_DOWN));
		const index = new BN(params.nextBuyerCounter.toString());

		const buyCardDirectIx = await this.getBuyCardDirectInstruction(
			cardPurchaseInfoPda,
			cardConfig,
			cardVault,
			cardVaultAta,
			tokenFeeMapPda,
			revenueVault,
			revenueVaultAta,
			usdc,
			buyer,
			buyerAta,
			userPurchaseRecord,
			{
				amount: parsedAmount,
				cardType: params.cardType === "carbon" ? "reloadable" : "non_reloadable",
				index,
				sourceTokenAddress: inputMint,
			},
		);

		const emailHash = params.buyerEmail.toString();

		const memoIx = new web3.TransactionInstruction({
			keys: [
				{
					pubkey: buyer,
					isSigner: true,
					isWritable: true,
				},
			],
			programId: MEMO_PROGRAM_ID,
			data: Buffer.from(JSON.stringify({ buyer: emailHash }), "utf-8"),
		});

		instructions.push(buyCardDirectIx, memoIx);

		return this._createPayload(buyer, instructions, [], addressLookupTableAccounts);
	}

	async buyCardDirect(params: BuyCardDirectParams) {
		const user = translateAddress(params.buyerAddress);
		const usdcToken = translateAddress(params.mintAddress);
		const amount = BigNumber(params.amount);

		const cardConfig = deriveCardConfigPda(this.program.programId);
		const cardPurchaseInfoPda = deriveCardPurchaseInfoPda(
			user,
			this.program.programId,
			params.nextBuyerCounter,
		);
		const tokenFeeMapPda = deriveTokenFeeMapPda(this.program.programId);
		const userPurchaseRecord = deriveUserPurchaseRecordPda(user, this.program.programId);

		const cardConfigInfo = await this.program.account.card.fetch(cardConfig, "confirmed");
		const cardVault = cardConfigInfo.cardVault;
		const revenueVault = cardConfigInfo.revenueVault;

		const cardVaultAta = getAssociatedTokenAddressSync(usdcToken, cardVault, true);
		const revenueVaultAta = getAssociatedTokenAddressSync(usdcToken, revenueVault, true);
		const userAta = getAssociatedTokenAddressSync(usdcToken, user);

		this._checkAmountIsWithinProviderRange(cardConfigInfo, amount, false);

		await this._checkAmountIsWithinDailyCardLimit(
			cardConfigInfo,
			userPurchaseRecord,
			amount,
			false,
		);

		const parsedAmount = new BN(amount.times(UNITS_PER_USDC).toFixed(0));
		const index = new BN(params.nextBuyerCounter.toString());

		const ix = await this.getBuyCardDirectInstruction(
			cardPurchaseInfoPda,
			cardConfig,
			cardVault,
			cardVaultAta,
			tokenFeeMapPda,
			revenueVault,
			revenueVaultAta,
			usdcToken,
			user,
			userAta,
			userPurchaseRecord,
			{
				amount: parsedAmount,
				cardType: params.cardType === "carbon" ? "reloadable" : "non_reloadable",
				index,
			},
		);

		const memoIx = new web3.TransactionInstruction({
			keys: [
				{
					pubkey: user,
					isSigner: true,
					isWritable: true,
				},
			],
			programId: MEMO_PROGRAM_ID,
			data: Buffer.from(JSON.stringify({ buyer: params.buyerEmail }), "utf-8"),
		});

		const payload = await this._createPayload(user, [ix, memoIx]);

		return payload;
	}

	private async _checkAmountIsWithinDailyCardLimit(
		cardConfigInfo: ParsedCardConfigInfo,
		userPurchaseRecord: web3.PublicKey,
		amount: BigNumber,
		amountParsed = true,
	) {
		const dailyCardBuyLimit = BigNumber(cardConfigInfo.dailyCardBuyLimit.toString());
		amount = amountParsed
			? amount
			: amount.times(UNITS_PER_USDC).decimalPlaces(0, BigNumber.ROUND_DOWN);

		const today = new Date();
		const userPurchaseRecordInfo = await this.program.account.vault.fetchNullable(
			userPurchaseRecord,
			"confirmed",
		);

		if (!userPurchaseRecordInfo) {
			console.debug("No user purchase record exists.");
			return;
		}

		const lastCardBoughtDate = new Date(userPurchaseRecordInfo.dateTimeInUnix.toNumber() * 1000);

		let cardBoughtInADay = BigNumber(0);
		if (areDatesOfSameDay(today, lastCardBoughtDate)) {
			cardBoughtInADay = BigNumber(userPurchaseRecordInfo.totalBoughtPerDay.toString()).plus(
				amount,
			);
		} else {
			cardBoughtInADay = amount;
		}

		if (cardBoughtInADay.isGreaterThan(dailyCardBuyLimit)) {
			throw new DailyCardLimitReachedError(
				dailyCardBuyLimit.div(UNITS_PER_USDC).toFixed(),
				cardBoughtInADay.div(UNITS_PER_USDC).toFixed(),
			);
		}
	}

	private _checkAmountIsWithinProviderRange(
		cardConfigInfo: ParsedCardConfigInfo,
		amount: BigNumber,
		amountParsed = true,
	) {
		const minRange = BigNumber(cardConfigInfo.providerConfig.minCardAmount.toString());
		const maxRange = BigNumber(cardConfigInfo.providerConfig.maxCardAmount.toString());

		amount = amountParsed
			? amount
			: amount.times(UNITS_PER_USDC).decimalPlaces(0, BigNumber.ROUND_DOWN);

		if (amount.isLessThan(minRange) || amount.isGreaterThan(maxRange)) {
			throw new AmountOutOfRangeError(
				minRange.div(UNITS_PER_USDC).toFixed(),
				maxRange.div(UNITS_PER_USDC).toFixed(),
				amount.div(UNITS_PER_USDC).toFixed(),
			);
		}
	}

	async getQuoteInfo(params: GetQuoteInfoParams) {
		const { inputAmount, inputMintAddress, outputMintAddress, slippagePercent } = params;
		const swapMode = params.swapMode ? params.swapMode : "ExactIn";

		const inputMint = translateAddress(inputMintAddress);
		const outputMint = translateAddress(outputMintAddress);

		let parsedInputAmount = BigNumber(inputAmount).times(UNITS_PER_USDC);
		if (swapMode === "ExactIn") {
			const inputMintDecimals = await getMintDecimals(this.provider.connection, inputMint);
			parsedInputAmount = BigNumber(inputAmount).times(TEN_BIGNUM.pow(inputMintDecimals));
		}
		const slippage = percentToBps(slippagePercent);

		const queryParams = new URLSearchParams({
			inputMint: inputMint.toString(),
			outputMint: outputMint.toString(),
			amount: parsedInputAmount.toFixed(0),
			slippageBps: slippage.toString(),
			swapMode: swapMode,
		});
		const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?${queryParams}`);
		const quoteInfojson: unknown = await quoteResponse.json();
		// console.log("quoteResponse:", quoteInfojson);
		const quoteInfo = await parseQuoteInfo(quoteInfojson);

		return quoteInfo;
	}

	async getNextBuyerCounter(): Promise<bigint> {
		const cardConfig = deriveCardConfigPda(this.program.programId);
		const decoded = await this.program.account.card.fetch(cardConfig, "confirmed");
		return BigInt(decoded.index.addn(1).toString());
	}

	async getCardConfigInfo(commitment: web3.Commitment = "confirmed"): Promise<CardConfigInfo> {
		const cardConfig = deriveCardConfigPda(this.program.programId);
		const decoded = await this.program.account.card.fetch(cardConfig, commitment);

		const providerConfig: ProviderConfig = {
			minCardAmount: parseDecimalString(
				BigNumber(decoded.providerConfig.minCardAmount.toString()).div(UNITS_PER_USDC).toFixed(),
			),
			maxCardAmount: parseDecimalString(
				BigNumber(decoded.providerConfig.maxCardAmount.toString()).div(UNITS_PER_USDC).toFixed(),
			),
			feeTiers: decoded.providerConfig.feeTiers.tiers.map<FeeTier>((feeTier) => {
				const feePercent = parsePercentString(bpsToPercent(feeTier.fee.toNumber()));
				const minAmount = parseDecimalString(
					BigNumber(feeTier.minAmount.toString()).div(UNITS_PER_USDC).toFixed(),
				);
				const maxAmount = parseDecimalString(
					BigNumber(feeTier.maxAmount.toString()).div(UNITS_PER_USDC).toFixed(),
				);
				return {
					feePercent,
					minAmount,
					maxAmount,
				};
			}),
		};

		const totalCardSold = parseDecimalString(
			BigNumber(decoded.totalBought.toString()).div(UNITS_PER_USDC).toFixed(),
		);
		const dailyCardPurchaseLimit = parseDecimalString(
			BigNumber(decoded.dailyCardBuyLimit.toString()).div(UNITS_PER_USDC).toFixed(),
		);

		return {
			address: parsePublicKeyString(cardConfig),
			index: BigInt(decoded.index.toString()),
			revenueFeePercent: parsePercentString(bpsToPercent(decoded.revenueFee.toNumber())),
			nativeFeePercent: parsePercentString(bpsToPercent(decoded.nativeFee.toNumber())),
			nonNativeFeePercent: parsePercentString(bpsToPercent(decoded.nonNativeFee.toNumber())),
			usdcMint: parsePublicKeyString(decoded.usdcMint),
			zicOwner: parsePublicKeyString(decoded.zicOwner),
			cardVault: parsePublicKeyString(decoded.cardVault),
			revenueVault: parsePublicKeyString(decoded.revenueVault),
			commissionVault: parsePublicKeyString(decoded.commissionVault),
			dailyCardPurchaseLimit,
			totalCardSold,
			providerConfig,
		};
	}

	async getCardPurchaseInfo(
		cardPurchaseInfoPda: Address,
		commitment: web3.Commitment = "confirmed",
	): Promise<CardPurchaseInfo> {
		const decoded = await this.program.account.prepaidCardBuyer.fetch(
			cardPurchaseInfoPda,
			commitment,
		);

		const amount = parseDecimalString(
			BigNumber(decoded.amount.toString()).div(UNITS_PER_USDC).toFixed(),
		);
		return {
			address: parsePublicKeyString(cardPurchaseInfoPda),
			amount,
			buyerAddress: parsePublicKeyString(decoded.buyerAddress),
			index: BigInt(decoded.index.toString()),
			purchaseAt: decoded.purchaseAt.toNumber(),
		};
	}

	async getUserPurchaseRecord(
		userPurchaseRecordKey: Address,
		commitment: web3.Commitment = "confirmed",
	): Promise<UserPurchaseRecordInfo> {
		const decoded = await this.program.account.vault.fetch(userPurchaseRecordKey, commitment);
		const totalCardBoughtPerDay = parseDecimalString(
			BigNumber(decoded.totalBoughtPerDay.toString()).div(UNITS_PER_USDC).toFixed(),
		);
		return {
			address: parsePublicKeyString(userPurchaseRecordKey),
			owner: parsePublicKeyString(decoded.userAddress),
			lastCardBoughtTimestamp: decoded.dateTimeInUnix.toNumber(),
			totalCardBoughtPerDay,
		};
	}

	async getCustomTokenFees(commitment: web3.Commitment = "confirmed"): Promise<TokenFeeRecordList> {
		const tokeFeeMapPda = deriveTokenFeeMapPda(this.program.programId);
		const decoded = await this.program.account.customFeeMap.fetch(tokeFeeMapPda, commitment);

		const tokenFeeList = decoded.feeMap.map((item) => ({
			tokenAddress: parsePublicKeyString(item.tokenAddress),
			fee: parsePercentString(bpsToPercent(item.fee.toNumber())),
		}));

		return tokenFeeList;
	}

	async getAllCardPurchaseInfo(buyerAddress: Address): Promise<Array<CardPurchaseInfo>> {
		const buyer = translateAddress(buyerAddress);
		const response = await this.provider.connection.getProgramAccounts(this.program.programId, {
			filters: [
				{
					dataSize: 64,
				},
				{
					memcmp: {
						bytes: buyer.toBase58(),
						offset: 16,
					},
				},
			],
			commitment: "confirmed",
		});
		console.debug("data size:", response.length);

		const parsed = response.map<CardPurchaseInfo>((value) => {
			const decoded = this.program.coder.accounts.decode("PrepaidCardBuyer", value.account.data);
			const amount = parseDecimalString(
				BigNumber(decoded.amount.toString()).div(UNITS_PER_USDC).toFixed(),
			);
			return {
				address: parsePublicKeyString(value.pubkey),
				amount,
				buyerAddress: parsePublicKeyString(decoded.buyerAddress),
				index: BigInt(decoded.index.toString()),
				purchaseAt: decoded.purchaseAt.toNumber(),
			};
		});

		return parsed;
	}

	addDirectCardPurchaseEventLister(
		callback: (event: CardPurchaseEvent, slot: number, signature: string) => void,
	) {
		const eventListener = this.program.addEventListener(
			"PrepaidCardDirectPurshase",
			(event, slot, signature) => {
				callback(
					{
						amount: parseDecimalString(
							BigNumber(event.amount.toString()).div(UNITS_PER_USDC).toFixed(),
						),
						from: parsePublicKeyString(event.from),
						index: BigInt(event.index.toString()),
						to: parsePublicKeyString(event.to),
					},
					slot,
					signature,
				);
			},
		);

		return eventListener;
	}

	async removeEventLister(eventListener: number) {
		await this.program.removeEventListener(eventListener);
	}
}
