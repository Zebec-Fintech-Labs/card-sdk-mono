import assert from "assert";
import { BigNumber } from "bignumber.js";

import { Address, AnchorProvider, BN, Program, translateAddress, web3 } from "@coral-xyz/anchor";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	getAssociatedTokenAddressSync,
	getMintDecimals,
	MEMO_PROGRAM_ID,
	SignTransactionFunction,
	TEN_BIGNUM,
	TOKEN_PROGRAM_ID,
	TransactionPayload,
} from "@zebec-network/solana-common";

import { ZEBEC_CARD_PROGRAM as ON_RAMP_PROGRAM, ZEBEC_STAKE_PROGRAM } from "../constants";
import { ZEBEC_CARD_IDL as ON_RAMP_IDL, ZebecCardIdl as OnRampIdl } from "../idl";
import {
	deriveCardConfigPda,
	deriveOnRampConfigPda,
	deriveOnRampUserCustodyPda,
	deriveStakeAddress,
	deriveStakeLockupAddress,
	deriveStakeUserNonceAddress,
	deriveStakeVaultAddress,
} from "../pda";
import { createReadonlyProvider, ReadonlyProvider } from "../provider";
import { DecimalString, parsePublicKeyString, PublicKeyString } from "../types";

type ProgramCreateFunction = (provider: ReadonlyProvider | AnchorProvider) => Program<OnRampIdl>;

/**
 * OnRampServiceBuilder is a builder class for creating a OnRampService instance.
 * It allows you to set the network, provider and program used to build service.
 */
export class OnRampServiceBuilder {
	private _program: Program<OnRampIdl> | undefined;
	private _provider: ReadonlyProvider | AnchorProvider | undefined;
	private _network: "mainnet-beta" | "devnet" | undefined;

	/**
	 *
	 * @param network The network to use. If not set, a default network: 'mainnet-beta' will be used.
	 * @returns
	 */
	setNetwork(network?: "mainnet-beta" | "devnet"): OnRampServiceBuilder {
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
	setProvider(provider?: ReadonlyProvider | AnchorProvider): OnRampServiceBuilder {
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
	setProgram(createProgram?: ProgramCreateFunction): OnRampServiceBuilder {
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
			? new Program(ON_RAMP_IDL, ON_RAMP_PROGRAM[this._network], this._provider)
			: createProgram(this._provider);

		return this;
	}

	build(): OnRampService {
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

		return new OnRampService(this._provider, this._program);
	}
}

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

export type InitOnRampConfigParams = {
	zicOwnerAddress: Address;
	onRampAdminAddress: Address;
	zbcnAddress: Address;
};

export type InitOnRampUserCustodyParams = {
	onRampAdminAddress: Address;
	userId: string;
};

export type SetNewOnRampAdminParams = {
	zicOwnerAddress: Address;
	newOnRampAdminAddress: Address;
};

export type OnRampTransferZbcnParams = {
	onRampAdminAddress: Address;
	senderUserId: string;
	receiverAddress: Address;
	amount: DecimalString;
	durationInDays: number;
};

export type OnRampStakeZbcnParams = {
	onRampAdminAddress: Address;
	lockupName: string;
	nonce: bigint;
	senderUserId: string;
	amount: DecimalString;
	durationInSeconds: number;
};

export type OnRampUnstakeZbcnParams = {
	senderUserId: string;
	onRampAdminAddress: Address;
	lockupName: string;
	nonce: bigint;
	feeVault: Address;
};

export type OnRampConfigInfo = {
	onRampAdmin: PublicKeyString;
	zbcnToken: PublicKeyString;
};

export type OnRampUserCustodyInfo = {
	userId: string;
};

export class OnRampService {
	constructor(
		readonly provider: ReadonlyProvider | AnchorProvider,
		readonly onRampProgram: Program<OnRampIdl>,
		readonly stakeProgramId: Address = ZEBEC_STAKE_PROGRAM["mainnet-beta"],
	) {}

	private async _createPayload(
		payerKey: web3.PublicKey,
		instructions: web3.TransactionInstruction[],
		signers?: web3.Signer[],
		addressLookupTableAccounts?: web3.AddressLookupTableAccount[],
	): Promise<TransactionPayload> {
		const errorMap: Map<number, string> = new Map();
		this.onRampProgram.idl.errors.forEach((error) => errorMap.set(error.code, error.msg));

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

	async getInitOnRampInstruction(
		zicOwner: web3.PublicKey,
		cardConfig: web3.PublicKey,
		onRampConfig: web3.PublicKey,
		data: InitOnRampInstructionData,
	) {
		const { admin, zbcnToken } = data;
		return this.onRampProgram.methods
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
		return this.onRampProgram.methods
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
		return this.onRampProgram.methods
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

		return this.onRampProgram.methods
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

	async getOnRampStakeInstruction(
		onRampAdmin: web3.PublicKey,
		onRampConfig: web3.PublicKey,
		stakeProgram: web3.PublicKey,
		lockup: web3.PublicKey,
		stakePda: web3.PublicKey,
		staker: web3.PublicKey,
		stakerTokenAccount: web3.PublicKey,
		stakeVault: web3.PublicKey,
		stakeVaultTokenAccount: web3.PublicKey,
		userNonce: web3.PublicKey,
		zbcnToken: web3.PublicKey,
		data: {
			amount: BN;
			lockPeriod: BN;
			nonce: BN;
			userId: string;
		},
	) {
		const { amount, lockPeriod, nonce, userId } = data;

		return this.onRampProgram.methods
			.stakeZbcn({
				amount,
				lockPeriod,
				nonce,
				userId,
			})
			.accounts({
				admin: onRampAdmin,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				lockup,
				onRampConfig,
				stakePda,
				stakeProgram,
				staker,
				stakerTokenAccount,
				stakeVault,
				stakeVaultTokenAccount,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				userNonce,
				zbcnToken,
			})
			.instruction();
	}

	async getOnRampUnstakeInstruction(
		onRampAdmin: web3.PublicKey,
		onRampConfig: web3.PublicKey,
		stakeProgram: web3.PublicKey,
		lockup: web3.PublicKey,
		stakePda: web3.PublicKey,
		staker: web3.PublicKey,
		stakerTokenAccount: web3.PublicKey,
		stakeVault: web3.PublicKey,
		stakeVaultTokenAccount: web3.PublicKey,
		userNonce: web3.PublicKey,
		zbcnToken: web3.PublicKey,
		feeVault: web3.PublicKey,
		feeVaultTokenAccount: web3.PublicKey,
		data: {
			nonce: BN;
			userId: string;
		},
	) {
		const { nonce, userId } = data;

		return this.onRampProgram.methods
			.unstakeZbcn({ nonce, userId })
			.accounts({
				admin: onRampAdmin,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				feeVault,
				feeVaultTokenAccount,
				lockup,
				onRampConfig,
				stakePda,
				stakeProgram,
				staker,
				stakerTokenAccount,
				stakeVault,
				stakeVaultTokenAccount,
				systemProgram: web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				userNonce,
				zbcnToken,
			})
			.instruction();
	}

	async initOnRampConfig(params: InitOnRampConfigParams) {
		const zicOwner = translateAddress(params.zicOwnerAddress);
		const onRampAdmin = translateAddress(params.onRampAdminAddress);
		const zbcnToken = translateAddress(params.zbcnAddress);

		const cardConfig = deriveCardConfigPda(this.onRampProgram.programId);
		const onRampConfig = deriveOnRampConfigPda(this.onRampProgram.programId);

		const ix = await this.getInitOnRampInstruction(zicOwner, cardConfig, onRampConfig, {
			admin: onRampAdmin,
			zbcnToken,
		});

		return this._createPayload(zicOwner, [ix]);
	}

	async setOnRampAdmin(params: SetNewOnRampAdminParams) {
		const zicOwner = translateAddress(params.zicOwnerAddress);
		const onRampAdmin = translateAddress(params.newOnRampAdminAddress);
		const cardConfig = deriveCardConfigPda(this.onRampProgram.programId);
		const onRampConfig = deriveOnRampConfigPda(this.onRampProgram.programId);

		const ix = await this.getSetOnRampAdminInstruction(cardConfig, onRampConfig, zicOwner, {
			newAdmin: onRampAdmin,
		});

		return this._createPayload(zicOwner, [ix], []);
	}

	async initOnRampUserCustody(params: InitOnRampUserCustodyParams) {
		const { userId } = params;
		const onRampAdmin = translateAddress(params.onRampAdminAddress);
		const onRampConfig = deriveOnRampConfigPda(this.onRampProgram.programId);
		const onRampUserCustody = deriveOnRampUserCustodyPda(userId, this.onRampProgram.programId);

		const onRampConfigInfo = await this.onRampProgram.account.onRamp.fetch(
			onRampConfig,
			"confirmed",
		);
		const zbcnToken = onRampConfigInfo.zbcnToken;

		if (!onRampAdmin.equals(onRampConfigInfo.admin)) {
			throw new Error("Invalid onRamp admin account.");
		}

		const onRampUserCustodyZbcnAccount = getAssociatedTokenAddressSync(
			zbcnToken,
			onRampUserCustody,
			true,
		);

		const ix = await this.getInitOnRampUserCustodyInstruction(
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

		const onRampConfig = deriveOnRampConfigPda(this.onRampProgram.programId);
		const onRampConfigInfo = await this.onRampProgram.account.onRamp.fetch(
			onRampConfig,
			"confirmed",
		);
		const zbcnToken = onRampConfigInfo.zbcnToken;

		if (!onRampAdmin.equals(onRampConfigInfo.admin)) {
			throw new Error("Invalid onRamp admin");
		}

		const onRampUserCustody = deriveOnRampUserCustodyPda(
			senderUserId,
			this.onRampProgram.programId,
		);
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

		const ix = await this.getOnRampTransferZbcnInstruction(
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

	async onRampStakeZbcn(params: OnRampStakeZbcnParams) {
		const { senderUserId } = params;

		const lockup = deriveStakeLockupAddress(params.lockupName, this.stakeProgramId);

		const onRampAdmin = translateAddress(params.onRampAdminAddress);
		const onRampConfig = deriveOnRampConfigPda(this.onRampProgram.programId);

		const onRampConfigInfo = await this.onRampProgram.account.onRamp.fetch(
			onRampConfig,
			"confirmed",
		);
		const zbcnToken = onRampConfigInfo.zbcnToken;
		console.log("zbcn token", zbcnToken.toString());

		const staker = deriveOnRampUserCustodyPda(senderUserId, this.onRampProgram.programId);
		const stakerTokenAccount = getAssociatedTokenAddressSync(zbcnToken, staker, true);

		const stakePda = deriveStakeAddress(staker, lockup, params.nonce, this.stakeProgramId);

		const stakeVault = deriveStakeVaultAddress(lockup, this.stakeProgramId);

		const stakeVaultTokenAccount = getAssociatedTokenAddressSync(zbcnToken, stakeVault, true);

		const userNonce = deriveStakeUserNonceAddress(staker, lockup, this.stakeProgramId);

		const zbcnDecimals = await getMintDecimals(this.provider.connection, zbcnToken);

		const amount = new BN(
			BigNumber(params.amount).times(TEN_BIGNUM.pow(zbcnDecimals)).toFixed(0, BigNumber.ROUND_DOWN),
		);

		const ix = await this.getOnRampStakeInstruction(
			onRampAdmin,
			onRampConfig,
			new web3.PublicKey(this.stakeProgramId),
			lockup,
			stakePda,
			staker,
			stakerTokenAccount,
			stakeVault,
			stakeVaultTokenAccount,
			userNonce,
			zbcnToken,
			{
				amount,
				lockPeriod: new BN(params.durationInSeconds),
				nonce: new BN(params.nonce.toString()),
				userId: senderUserId,
			},
		);

		return this._createPayload(onRampAdmin, [ix]);
	}

	async onRampUnstakeZbcn(params: OnRampUnstakeZbcnParams) {
		const { senderUserId } = params;

		const lockup = deriveStakeLockupAddress(params.lockupName, this.stakeProgramId);

		const onRampAdmin = translateAddress(params.onRampAdminAddress);
		const onRampConfig = deriveOnRampConfigPda(this.onRampProgram.programId);

		const onRampConfigInfo = await this.onRampProgram.account.onRamp.fetch(
			onRampConfig,
			"confirmed",
		);
		const zbcnToken = onRampConfigInfo.zbcnToken;

		const staker = deriveOnRampUserCustodyPda(senderUserId, this.onRampProgram.programId);
		const stakerTokenAccount = getAssociatedTokenAddressSync(zbcnToken, staker, true);

		const stakePda = deriveStakeAddress(staker, lockup, params.nonce, this.stakeProgramId);

		const stakeVault = deriveStakeVaultAddress(lockup, this.stakeProgramId);
		const stakeVaultTokenAccount = getAssociatedTokenAddressSync(zbcnToken, stakeVault, true);

		const userNonce = deriveStakeUserNonceAddress(staker, lockup, this.stakeProgramId);
		const feeVault = translateAddress(params.feeVault);
		const feeVaultTokenAccount = getAssociatedTokenAddressSync(zbcnToken, feeVault, true);

		const ix = await this.getOnRampUnstakeInstruction(
			onRampAdmin,
			onRampConfig,
			new web3.PublicKey(this.stakeProgramId),
			lockup,
			stakePda,
			staker,
			stakerTokenAccount,
			stakeVault,
			stakeVaultTokenAccount,
			userNonce,
			zbcnToken,
			feeVault,
			feeVaultTokenAccount,
			{
				nonce: new BN(params.nonce.toString()),
				userId: senderUserId,
			},
		);

		return this._createPayload(onRampAdmin, [ix]);
	}

	async getUserNonceInfo(
		userNonceAddress: Address,
		commitment: web3.Commitment = "finalized",
	): Promise<{ address: web3.PublicKey; nonce: bigint } | null> {
		const userNonce = translateAddress(userNonceAddress);
		const accountInfo = await this.provider.connection.getAccountInfo(userNonce, commitment);

		if (!accountInfo) {
			return null;
		}

		const data = accountInfo.data;

		assert(data.length === 16, "Invalid account data length");

		const discriminator = data.subarray(0, 8);
		const USER_NONCE_DISCRIMINATOR = [235, 133, 1, 243, 18, 135, 88, 224]; // anchor generated discriminator for UserNonce account

		assert.deepStrictEqual(
			discriminator,
			Buffer.from(USER_NONCE_DISCRIMINATOR),
			"Invalid account discriminator for user nonce",
		);

		const nonce = BigInt(new BN(data.subarray(8, 16), "le").toString());

		return {
			address: userNonce,
			nonce,
		};
	}

	async getOnRampConfigInfo(commitment: web3.Commitment = "confirmed"): Promise<OnRampConfigInfo> {
		const onRampConfig = deriveOnRampConfigPda(this.onRampProgram.programId);

		const decoded = await this.onRampProgram.account.onRamp.fetch(onRampConfig, commitment);

		return {
			onRampAdmin: parsePublicKeyString(decoded.admin),
			zbcnToken: parsePublicKeyString(decoded.zbcnToken),
		};
	}

	async getOnRampUserCustodyInfo(
		onRampUserCustody: Address,
		commitment: web3.Commitment = "confirmed",
	): Promise<OnRampUserCustodyInfo> {
		const decoded = await this.onRampProgram.account.onRampCustody.fetch(
			onRampUserCustody,
			commitment,
		);

		return {
			userId: decoded.userId,
		};
	}
}
