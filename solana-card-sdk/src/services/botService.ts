import { Address, AnchorProvider, BN, Program, translateAddress, web3 } from "@coral-xyz/anchor";
import { areDatesOfSameDay } from "@zebec-network/core-utils";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	getAssociatedTokenAddressSync,
	MEMO_PROGRAM_ID,
	SignTransactionFunction,
	TOKEN_PROGRAM_ID,
	TransactionPayload,
	UNITS_PER_USDC,
} from "@zebec-network/solana-common";

import { ZEBEC_CARD_PROGRAM as ZEBEC_CARD_BOT_PROGRAM } from "../constants";
import { AmountOutOfRangeError, DailyCardLimitReachedError } from "../errors";
import { ZEBEC_CARD_IDL as ZEBEC_CARD_BOT_IDL, ZebecCardIdl as ZebecCardBotIdl } from "../idl";
import {
	deriveBotUserCustodyPda,
	deriveCardBotConfigPda,
	deriveCardConfigPda,
	deriveTokenFeeMapPda,
} from "../pda";
import { createReadonlyProvider, ReadonlyProvider } from "../provider";
import {
	CardType,
	DecimalString,
	InstructionCardType,
	ParsedCardConfigInfo,
	parseDecimalString,
	parsePublicKeyString,
	PublicKeyString,
} from "../types";

type ProgramCreateFunction = (
	provider: ReadonlyProvider | AnchorProvider,
) => Program<ZebecCardBotIdl>;

/**
 * CardBotServiceBuilder is a builder class for creating a CardBotService instance.
 * It allows you to set the network, provider and program used to build service.
 */
export class CardBotServiceBuilder {
	private _program: Program<ZebecCardBotIdl> | undefined;
	private _provider: ReadonlyProvider | AnchorProvider | undefined;
	private _network: "mainnet-beta" | "devnet" | undefined;

	/**
	 *
	 * @param network The network to use. If not set, a default network: 'mainnet-beta' will be used.
	 * @returns
	 */
	setNetwork(network?: "mainnet-beta" | "devnet"): CardBotServiceBuilder {
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
	setProvider(provider?: ReadonlyProvider | AnchorProvider): CardBotServiceBuilder {
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
	setProgram(createProgram?: ProgramCreateFunction): CardBotServiceBuilder {
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
			? new Program(ZEBEC_CARD_BOT_IDL, ZEBEC_CARD_BOT_PROGRAM[this._network], this._provider)
			: createProgram(this._provider);

		return this;
	}

	build(): CardBotService {
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

		return new CardBotService(this._provider, this._program);
	}
}

export type BuyCardBotInstructionData = {
	amount: BN;
	sourceTokenAddress: web3.PublicKey;
	userId: string;
	cardType: InstructionCardType;
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

export type InitBotConfigParams = {
	zicOwnerAddress: Address;
	botAdminAddress: Address;
};

export type InitBotUserCustodyParams = {
	botAdminAddress: Address;
	usdcMintAddress: Address;
	userId: string;
};

export type SetNewBotAdminParams = {
	newBotAdminAddress: Address;
	zicOwnerAddress: Address;
};

export type BuyCardThroughBotParams = {
	botAdminAddress: Address;
	usdcMintAddress: Address;
	userId: string;
	cardType: CardType;
	amount: DecimalString;
};

export type CardBotConfigInfo = {
	botAdmin: PublicKeyString;
};

export type BotUserCustodyInfo = {
	userId: string;
	lastCardBoughtTimestamp: number;
	totalCardBoughtPerDay: DecimalString;
};

export class CardBotService {
	constructor(
		readonly provider: ReadonlyProvider | AnchorProvider,
		readonly program: Program<ZebecCardBotIdl>,
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

	async getInitBotConfigInstruction(
		cardBotConfig: web3.PublicKey,
		cardPda: web3.PublicKey,
		zicOwner: web3.PublicKey,
		data: InitBotConfigData,
	) {
		return this.program.methods
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
		return this.program.methods
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
		return this.program.methods
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

		return this.program.methods
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

	async initBotConfig(params: InitBotConfigParams) {
		const zicOwner = translateAddress(params.zicOwnerAddress);
		const botAdmin = translateAddress(params.botAdminAddress);

		const cardBotConfig = deriveCardBotConfigPda(this.program.programId);
		const cardConfig = deriveCardConfigPda(this.program.programId);

		const ix = await this.getInitBotConfigInstruction(cardBotConfig, cardConfig, zicOwner, {
			botAdmin,
		});

		return this._createPayload(zicOwner, [ix], []);
	}

	async initBotUserCustody(params: InitBotUserCustodyParams) {
		const { userId } = params;
		const botAdmin = translateAddress(params.botAdminAddress);
		const usdcToken = translateAddress(params.usdcMintAddress);
		const cardBotConfig = deriveCardBotConfigPda(this.program.programId);
		const userCustody = deriveBotUserCustodyPda(userId, this.program.programId);
		const userCustodyAta = getAssociatedTokenAddressSync(usdcToken, userCustody, true);

		const ix = await this.getInitBotUserCustodyInstruction(
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

		const ix = await this.getSetBotAdminInstruction(cardBotConfig, cardConfig, zicOwner, {
			newAdmin: newBotAdmin,
		});

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

		await this._checkAmountIsWithinProviderRange(
			cardConfigInfo.providerConfig.minCardAmount,
			cardConfigInfo.providerConfig.maxCardAmount,
			new BN(amount.toFixed(0)),
		);

		await this._checkAmountIsWithinDailyCardLimitForBot(
			cardConfigInfo,
			userCustody,
			new BN(amount.toFixed(0)),
		);

		const ix = await this.getBuyCardBotInstruction(
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

	private async _checkAmountIsWithinProviderRange(minRange: BN, maxRange: BN, amount: BN) {
		if (amount.lt(minRange) || amount.gt(maxRange)) {
			throw new AmountOutOfRangeError(
				BigNumber(minRange.toString()).div(UNITS_PER_USDC).toFixed(),
				BigNumber(maxRange.toString()).div(UNITS_PER_USDC).toFixed(),
				BigNumber(amount.toString()).div(UNITS_PER_USDC).toFixed(),
			);
		}
	}

	private async _checkAmountIsWithinDailyCardLimitForBot(
		cardConfigInfo: ParsedCardConfigInfo,
		botUserCustody: web3.PublicKey,
		amount: BN,
	) {
		const dailyCardBuyLimit = cardConfigInfo.dailyCardBuyLimit;

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

		let cardBoughtInADay = new BN(0);
		if (areDatesOfSameDay(today, lastCardBoughtDate)) {
			cardBoughtInADay = botUserCustodyInfo.totalBoughtPerDay.add(amount);
		} else {
			cardBoughtInADay = amount;
		}

		if (cardBoughtInADay.gt(dailyCardBuyLimit)) {
			throw new DailyCardLimitReachedError(
				BigNumber(dailyCardBuyLimit.toString()).div(UNITS_PER_USDC).toFixed(),
				BigNumber(cardBoughtInADay.toString()).div(UNITS_PER_USDC).toFixed(),
			);
		}
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
}
