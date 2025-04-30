import { BigNumber } from "bignumber.js";
import { Buffer } from "buffer";

import { Address, AnchorProvider, BN, Program, translateAddress, web3 } from "@coral-xyz/anchor";
import {
	areDatesOfSameDay,
	bpsToPercent,
	createAssociatedTokenAccountInstruction,
	getAssociatedTokenAddressSync,
	getMintDecimals,
	hashSHA256,
	MEMO_PROGRAM_ID,
	percentToBps,
	SignTransactionFunction,
	TEN_BIGNUM,
	TransactionPayload,
	UNITS_PER_USDC,
	WSOL,
} from "@zebec-network/solana-common";

import { CARD_LOOKUP_TABLE_ADDRESS, JUP_SWAP_API, ZEBEC_CARD_PROGRAM } from "./constants";
import {
	AmountOutOfRangeError,
	AssociatedTokenAccountDoesNotExistsError,
	DailyCardLimitReachedError,
	InvalidUsdcAddressError,
	NotEnoughBalanceError,
	QuoteResponseError,
} from "./errors";
import { ZEBEC_CARD_IDL, ZebecCardIdl } from "./idl";
import {
	ParsedCardConfigInfo,
	ParsedFeeTier,
	ParsedTokenFeeStruct,
	ZebecCardInstructions,
} from "./instructions";
import {
	deriveBotUserCustodyPda,
	deriveCardBotConfigPda,
	deriveCardConfigPda,
	deriveCardPurchaseInfoPda,
	deriveOnRampConfigPda,
	deriveOnRampUserCustodyPda,
	deriveTokenFeeMapPda,
	deriveUserPurchaseRecordPda,
} from "./pda";
import { createReadonlyProvider, ReadonlyProvider } from "./provider";
import {
	BigIntString,
	DecimalString,
	EmailString,
	parseDecimalString,
	parsePercentString,
	parsePublicKeyString,
	PercentString,
	PublicKeyString,
} from "./types";
import { parseQuoteInfo, sortFeeTierDesc } from "./utils";

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

export type CardBotConfigInfo = {
	botAdmin: PublicKeyString;
};

export type BotUserCustodyInfo = {
	userId: string;
	lastCardBoughtTimestamp: number;
	totalCardBoughtPerDay: DecimalString;
};

export type OnRampConfigInfo = {
	onRampAdmin: PublicKeyString;
	zbcnToken: PublicKeyString;
};

export type OnRampUserCustodyInfo = {
	userId: string;
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

export type CardType = "silver" | "carbon";

export type BuyCardDirectParams = {
	buyerAddress: Address;
	nextBuyerCounter: bigint;
	amount: DecimalString;
	cardType: CardType;
	buyerEmail: EmailString;
	mintAddress: Address;
};

export type SwapAndBuyCardDirectParams = {
	quoteInfo: QuoteInfo;
	buyerAddress: Address;
	nextBuyerCounter: bigint;
	cardType: CardType;
	buyerEmail: EmailString;
};

export type GetQuoteInfoParams = {
	inputMintAddress: Address;
	outputMintAddress: Address;
	inputAmount: DecimalString;
	slippagePercent: PercentString;
	swapMode?: SwapMode;
};

export type InitBotConfigParams = {
	zicOwnerAddress: PublicKeyString;
	botAdminAddress: PublicKeyString;
};

export type InitBotUserCustodyParams = {
	botAdminAddress: PublicKeyString;
	usdcMintAddress: PublicKeyString;
	userId: string;
};

export type SetNewBotAdminParams = {
	newBotAdminAddress: PublicKeyString;
	zicOwnerAddress: PublicKeyString;
};

export type BuyCardThroughBotParams = {
	botAdminAddress: PublicKeyString;
	usdcMintAddress: PublicKeyString;
	userId: string;
	cardType: CardType;
	amount: DecimalString;
};

export type InitOnRampConfigParams = {
	zicOwnerAddress: PublicKeyString;
	onRampAdminAddress: PublicKeyString;
	zbcnAddress: PublicKeyString;
};

export type InitOnRampUserCustodyParams = {
	onRampAdminAddress: PublicKeyString;
	userId: string;
};

export type SetNewOnRampAdminParams = {
	zicOwnerAddress: PublicKeyString;
	newOnRampAdminAddress: PublicKeyString;
};

export type OnRampTransferZbcnParams = {
	onRampAdminAddress: PublicKeyString;
	senderUserId: string;
	receiverAddress: PublicKeyString;
	amount: DecimalString;
	durationInDays: number;
};

export type CardPurchaseEvent = {
	index: bigint;
	from: PublicKeyString;
	to: PublicKeyString;
	amount: DecimalString;
};

type ProgramCreateFunction = (provider: ReadonlyProvider | AnchorProvider) => Program<ZebecCardIdl>;

/**
 * StakeServiceBuilder is a builder class for creating a StakeService instance.
 * It allows you to set the network, provider, and program to use.
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

export class ZebecCardService {
	readonly instructions: ZebecCardInstructions;

	constructor(
		readonly provider: ReadonlyProvider | AnchorProvider,
		readonly program: Program<ZebecCardIdl>,
	) {
		this.instructions = new ZebecCardInstructions(this.program);
	}

	private async _createPayload(
		payerKey: web3.PublicKey,
		instructions: web3.TransactionInstruction[],
		signers?: web3.Signer[],
		addressLookupTableAccounts?: web3.AddressLookupTableAccount[],
	): Promise<TransactionPayload> {
		const errorMap: Map<number, string> = new Map();
		this.program.idl.errors.forEach((error) => errorMap.set(error.code, error.msg));

		const provider = this.provider;

		if (provider instanceof ReadonlyProvider) {
			throw new Error("Provider is readonly. Cannot be used for creating transaction payload.");
		}

		const signTransaction: SignTransactionFunction = async (tx) => {
			return provider.wallet.signTransaction(tx);
		};

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
		const ix = await this.instructions.getInitCardConfigsInstruction(
			cardConfig,
			usdcToken,
			zicOwner,
			{
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
			},
		);

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
		const ix = await this.instructions.getSetCardConfigsInstruction(cardConfig, zicOwner, {
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

		const ix = await this.instructions.getSetCustomFeesInstruction(
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

		const ix = await this.instructions.getDeleteCustomFeesInstruction(
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

		const buyCardDirectIx = await this.instructions.getBuyCardDirectInstruction(
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

		const emailHash = await hashSHA256(params.buyerEmail.toString());

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

		const ix = await this.instructions.getBuyCardDirectInstruction(
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

		const emailHash = await hashSHA256(params.buyerEmail.toString());

		const memoIx = new web3.TransactionInstruction({
			keys: [
				{
					pubkey: user,
					isSigner: true,
					isWritable: true,
				},
			],
			programId: MEMO_PROGRAM_ID,
			data: Buffer.from(JSON.stringify({ buyer: emailHash }), "utf-8"),
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

	async initBotConfig(params: InitBotConfigParams) {
		const zicOwner = translateAddress(params.zicOwnerAddress);
		const botAdmin = translateAddress(params.botAdminAddress);

		const cardBotConfig = deriveCardBotConfigPda(this.program.programId);
		const cardConfig = deriveCardConfigPda(this.program.programId);

		const ix = await this.instructions.getInitBotConfigInstruction(
			cardBotConfig,
			cardConfig,
			zicOwner,
			{
				botAdmin,
			},
		);

		return this._createPayload(zicOwner, [ix], []);
	}

	async initBotUserCustody(params: InitBotUserCustodyParams) {
		const { userId } = params;
		const botAdmin = translateAddress(params.botAdminAddress);
		const usdcToken = translateAddress(params.usdcMintAddress);
		const cardBotConfig = deriveCardBotConfigPda(this.program.programId);
		const userCustody = deriveBotUserCustodyPda(userId, this.program.programId);
		const userCustodyAta = getAssociatedTokenAddressSync(usdcToken, userCustody, true);

		const ix = await this.instructions.getInitBotUserCustodyInstruction(
			botAdmin,
			cardBotConfig,
			usdcToken,
			userCustody,
			userCustodyAta,
			{
				userId,
			},
		);

		return this._createPayload(botAdmin, [ix], []);
	}

	async setBotAdmin(params: SetNewBotAdminParams) {
		const newBotAdmin = translateAddress(params.newBotAdminAddress);
		const zicOwner = translateAddress(params.zicOwnerAddress);

		const cardBotConfig = deriveCardBotConfigPda(this.program.programId);
		const cardConfig = deriveCardConfigPda(this.program.programId);

		const ix = await this.instructions.getSetBotAdminInstruction(
			cardBotConfig,
			cardConfig,
			zicOwner,
			{ newAdmin: newBotAdmin },
		);

		return this._createPayload(zicOwner, [ix], []);
	}

	async buyCardThroughBot(params: BuyCardThroughBotParams) {
		const { userId, cardType } = params;
		const botAdmin = translateAddress(params.botAdminAddress);
		const usdcToken = translateAddress(params.usdcMintAddress);
		const cardBotConfig = deriveCardBotConfigPda(this.program.programId);
		const cardConfig = deriveCardConfigPda(this.program.programId);
		const feeMapPda = deriveTokenFeeMapPda(this.program.programId);
		const userCustody = deriveBotUserCustodyPda(userId, this.program.programId);
		const userCustodyAta = getAssociatedTokenAddressSync(usdcToken, userCustody, true);

		const cardConfigInfo = await this.program.account.card.fetch(cardConfig);
		const cardVault = cardConfigInfo.cardVault;
		const revenueVault = cardConfigInfo.revenueVault;

		const cardVaultAta = getAssociatedTokenAddressSync(usdcToken, cardVault, true);
		const revenueVaultAta = getAssociatedTokenAddressSync(usdcToken, revenueVault, true);

		const amount = BigNumber(params.amount)
			.times(UNITS_PER_USDC)
			.decimalPlaces(0, BigNumber.ROUND_DOWN);

		this._checkAmountIsWithinProviderRange(cardConfigInfo, amount, true);

		await this._checkAmountIsWithinDailyCardLimitForBot(cardConfigInfo, userCustody, amount, true);

		const ix = await this.instructions.getBuyCardBotInstruction(
			botAdmin,
			cardBotConfig,
			cardConfig,
			cardVault,
			cardVaultAta,
			feeMapPda,
			revenueVault,
			revenueVaultAta,
			usdcToken,
			userCustody,
			userCustodyAta,
			{
				amount: new BN(amount.toFixed()),
				sourceTokenAddress: usdcToken,
				userId,
				cardType: cardType === "carbon" ? "reloadable" : "non_reloadable",
			},
		);

		const memoIx = new web3.TransactionInstruction({
			keys: [
				{
					pubkey: botAdmin,
					isSigner: true,
					isWritable: true,
				},
			],
			programId: MEMO_PROGRAM_ID,
			data: Buffer.from(JSON.stringify({ userId }), "utf-8"),
		});

		return this._createPayload(botAdmin, [ix, memoIx], []);
	}

	private async _checkAmountIsWithinDailyCardLimitForBot(
		cardConfigInfo: ParsedCardConfigInfo,
		botUserCustody: web3.PublicKey,
		amount: BigNumber,
		amountParsed = true,
	) {
		const dailyCardBuyLimit = BigNumber(cardConfigInfo.dailyCardBuyLimit.toString());
		amount = amountParsed
			? amount
			: amount.times(UNITS_PER_USDC).decimalPlaces(0, BigNumber.ROUND_DOWN);

		const botUserCustodyInfo = await this.program.account.cardCustodyData.fetchNullable(
			botUserCustody,
			"confirmed",
		);

		if (!botUserCustodyInfo) {
			console.debug("No user purchase record exists.");
			return;
		}

		const today = new Date();
		const lastCardBoughtDate = new Date(botUserCustodyInfo.dateTimeInUnix.toNumber() * 1000);

		let cardBoughtInADay = BigNumber(0);
		if (areDatesOfSameDay(today, lastCardBoughtDate)) {
			cardBoughtInADay = BigNumber(botUserCustodyInfo.totalBoughtPerDay.toString()).plus(amount);
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

	async initOnRampConfig(params: InitOnRampConfigParams) {
		const zicOwner = translateAddress(params.zicOwnerAddress);
		const onRampAdmin = translateAddress(params.onRampAdminAddress);
		const zbcnToken = translateAddress(params.zbcnAddress);

		const cardConfig = deriveCardConfigPda(this.program.programId);
		const onRampConfig = deriveOnRampConfigPda(this.program.programId);

		const ix = await this.instructions.getInitOnRampInstruction(
			zicOwner,
			cardConfig,
			onRampConfig,
			{
				admin: onRampAdmin,
				zbcnToken,
			},
		);

		return this._createPayload(zicOwner, [ix]);
	}

	async setOnRampAdmin(params: SetNewOnRampAdminParams) {
		const zicOwner = translateAddress(params.zicOwnerAddress);
		const onRampAdmin = translateAddress(params.newOnRampAdminAddress);
		const cardConfig = deriveCardConfigPda(this.program.programId);
		const onRampConfig = deriveOnRampConfigPda(this.program.programId);

		const ix = await this.instructions.getSetOnRampAdminInstruction(
			cardConfig,
			onRampConfig,
			zicOwner,
			{
				newAdmin: onRampAdmin,
			},
		);

		return this._createPayload(zicOwner, [ix], []);
	}

	async initOnRampUserCustody(params: InitOnRampUserCustodyParams) {
		const { userId } = params;
		const onRampAdmin = translateAddress(params.onRampAdminAddress);
		const onRampConfig = deriveOnRampConfigPda(this.program.programId);
		const onRampUserCustody = deriveOnRampUserCustodyPda(userId, this.program.programId);

		const onRampConfigInfo = await this.program.account.onRamp.fetch(onRampConfig, "confirmed");
		const zbcnToken = onRampConfigInfo.zbcnToken;

		if (!onRampAdmin.equals(onRampConfigInfo.admin)) {
			throw new Error("Invalid onRamp admin account.");
		}

		const onRampUserCustodyZbcnAccount = getAssociatedTokenAddressSync(
			zbcnToken,
			onRampUserCustody,
			true,
		);

		const ix = await this.instructions.getInitOnRampUserCustodyInstruction(
			onRampAdmin,
			onRampConfig,
			onRampUserCustody,
			onRampUserCustodyZbcnAccount,
			zbcnToken,
			{
				userId,
			},
		);

		return this._createPayload(onRampAdmin, [ix], []);
	}

	async onRampTransferZbcn(params: OnRampTransferZbcnParams) {
		const { senderUserId, onRampAdminAddress } = params;
		const onRampAdmin = translateAddress(onRampAdminAddress);
		const receiver = translateAddress(params.receiverAddress);

		const onRampConfig = deriveOnRampConfigPda(this.program.programId);
		const onRampConfigInfo = await this.program.account.onRamp.fetch(onRampConfig, "confirmed");
		const zbcnToken = onRampConfigInfo.zbcnToken;

		if (!onRampAdmin.equals(onRampConfigInfo.admin)) {
			throw new Error("Invalid onRamp admin");
		}

		const onRampUserCustody = deriveOnRampUserCustodyPda(senderUserId, this.program.programId);
		const onRampUserCustodyZbcnAccount = getAssociatedTokenAddressSync(
			zbcnToken,
			onRampUserCustody,
			true,
		);

		const receiverZbcnAccount = getAssociatedTokenAddressSync(zbcnToken, receiver, true);

		const zbcnDecimals = await getMintDecimals(this.provider.connection, zbcnToken);

		const amount = new BN(
			BigNumber(params.amount).times(TEN_BIGNUM.pow(zbcnDecimals)).toFixed(0, BigNumber.ROUND_DOWN),
		);

		const ix = await this.instructions.getOnRampTransferZbcnInstruction(
			onRampAdmin,
			onRampConfig,
			onRampUserCustody,
			onRampUserCustodyZbcnAccount,
			receiver,
			receiverZbcnAccount,
			zbcnToken,
			{
				amount,
				userId: senderUserId,
			},
		);

		const memoIx = new web3.TransactionInstruction({
			keys: [
				{
					pubkey: onRampAdmin,
					isSigner: true,
					isWritable: true,
				},
			],
			programId: MEMO_PROGRAM_ID,
			data: Buffer.from(JSON.stringify({ durationInDays: params.durationInDays }), "utf-8"),
		});

		return this._createPayload(onRampAdmin, [ix, memoIx]);
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

	async getCardBotConfigInfo(
		commitment: web3.Commitment = "confirmed",
	): Promise<CardBotConfigInfo> {
		const cardBotConfig = deriveCardBotConfigPda(this.program.programId);
		const decoded = await this.program.account.cardBot.fetch(cardBotConfig, commitment);

		return {
			botAdmin: parsePublicKeyString(decoded.botAdmin),
		};
	}

	async getBotUserCustodyInfo(
		userCustody: Address,
		commitment: web3.Commitment = "confirmed",
	): Promise<BotUserCustodyInfo> {
		const decoded = await this.program.account.cardCustodyData.fetch(userCustody, commitment);

		const totalCardBoughtPerDay = parseDecimalString(
			BigNumber(decoded.totalBoughtPerDay.toString()).div(UNITS_PER_USDC).toFixed(),
		);
		return {
			lastCardBoughtTimestamp: decoded.dateTimeInUnix.toNumber(),
			totalCardBoughtPerDay,
			userId: decoded.userId,
		};
	}

	async getOnRampConfigInfo(commitment: web3.Commitment = "confirmed"): Promise<OnRampConfigInfo> {
		const onRampConfig = deriveOnRampConfigPda(this.program.programId);

		const decoded = await this.program.account.onRamp.fetch(onRampConfig, commitment);

		return {
			onRampAdmin: parsePublicKeyString(decoded.admin),
			zbcnToken: parsePublicKeyString(decoded.zbcnToken),
		};
	}

	async getOnRampUserCustodyInfo(
		onRampUserCustody: Address,
		commitment: web3.Commitment = "confirmed",
	): Promise<OnRampUserCustodyInfo> {
		const decoded = await this.program.account.onRampCustody.fetch(onRampUserCustody, commitment);

		return {
			userId: decoded.userId,
		};
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
