import type { Logger } from "@canton-network/core-types";
import {
	type AuthTokenProvider,
	ClientCredentialOAuthController,
	LedgerController,
	localNetStaticConfig,
	TokenStandardController,
	ValidatorController,
	type WalletSDK,
	WalletSDKImpl,
} from "@canton-network/wallet-sdk";

import { ZebecCardAPIService } from "../helpers/apiHelpers";

export const CANTON_NATIVE_INSTRUMENT_ID = "Amulet";
export const DEVNET_CANTON_NATIVE_INSTRUMENT_ADMIN =
	"DSO::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a";
/**
 * Wallet adapter interface — the frontend implements this to bridge the
 * dApp wallet (e.g. Canton dApp SDK, browser extension) with CantonService.
 *
 * The service calls `executeTransaction` with the prepared command and
 * disclosed contracts produced by the wallet-sdk; the adapter is responsible
 * for signing and submitting them through whichever wallet integration the
 * frontend uses.
 */
export interface CantonWalletAdapter {
	/** The Daml party ID of the connected user. */
	readonly partyId: string;

	/**
	 * Sign and submit a transaction to the Canton ledger.
	 *
	 * @param command          - The exercise command prepared by the wallet-sdk.
	 * @param disclosedContracts - Contracts that must be disclosed alongside
	 *                           the command for the transaction to succeed.
	 * @returns The submitted transaction / command ID.
	 */
	executeTransaction(
		command: {
			ExerciseCommand:
			| {
				templateId: string;
				contractId: string;
				choice: string;
				choiceArgument: unknown;
			}
			| {
				templateId: string;
				contractId: string;
				choice: string;
				choiceArgument: unknown;
			};
		},
		disclosedContracts: (
			| {
				templateId?: string;
				contractId: string;
				createdEventBlob: string;
				synchronizerId: string;
			}
			| {
				templateId?: string;
				contractId: string;
				createdEventBlob: string;
				synchronizerId: string;
			}
		)[],
	): Promise<string>;
}

export interface CantonConfig {
	ledgerApiUrl: string;
	validatorAppApiUrl: string;
	/**
	 * Transfer-factory registry URL.
	 * Defaults to `localNetStaticConfig.LOCALNET_REGISTRY_API_URL` when omitted.
	 */
	registryApiUrl?: string | URL;
	auth: {
		configUrl: string;
		userId?: string;
		userSecret?: string;
		adminId?: string;
		adminSecret?: string;
		scope?: string;
		audience?: string;
	}
}

/** Parameters for transferring native Canton coin (Amulet). */
export interface NativeTransferParams {
	amount: number | string;
	/**
	 * The instrument admin party for the Amulet instrument on the target network
	 * (typically the DSO party).
	 */
	instrumentAdmin?: string;
	memo?: string;
}

/** Parameters for transferring a CIP-0056 standard token. */
export interface TokenTransferParams {
	amount: number | string;
	/** The instrument / token identifier as registered in the token registry. */
	instrumentId: string;
	/** The admin party that governs this instrument. */
	instrumentAdmin: string;
	/**
	 * Override the registry URL for this specific token.
	 * Falls back to `CantonConfig.registryApiUrl` when omitted.
	 */
	registryApiUrl?: string | URL;
	memo?: string;
}

// ---------------------------------------------------------------------------
// SDK factory helpers
// ---------------------------------------------------------------------------

export function createLedgerFactory(ledgerApiUrl: string) {
	return (
		userId: string,
		authTokenProvider: AuthTokenProvider,
		isAdmin: boolean,
	) => {
		return new LedgerController(
			userId,
			new URL(ledgerApiUrl),
			undefined,
			isAdmin,
			authTokenProvider,
		);
	};
}

export function createValidatorFactory(validatorAppApiUrl: string) {
	return (userId: string, authTokenProvider: AuthTokenProvider) => {
		return new ValidatorController(
			userId,
			new URL(validatorAppApiUrl),
			authTokenProvider,
		);
	};
}

export function createTokenStandardFactory(
	ledgerApiUrl: string,
	validatorAppApiUrl: string,
) {
	return (
		userId: string,
		authTokenProvider: AuthTokenProvider,
		isAdmin: boolean,
	) => {
		return new TokenStandardController(
			userId,
			new URL(ledgerApiUrl),
			new URL(validatorAppApiUrl),
			undefined,
			authTokenProvider,
			isAdmin,
		);
	};
}

export function createAuthFactory(
	configUrl: string,
	logger: Logger = console,
	userId?: string,
	userSecret?: string,
	adminId?: string,
	adminSecret?: string,
	scope?: string,
	audience?: string,
) {
	return () =>
		new ClientCredentialOAuthController(
			configUrl,
			logger,
			userId,
			userSecret,
			adminId,
			adminSecret,
			scope,
			audience,
		);
}

// ---------------------------------------------------------------------------
// CantonService
// ---------------------------------------------------------------------------

export class CantonService {
	readonly cantonWalletSdk: WalletSDK;
	private readonly apiService: ZebecCardAPIService;
	private readonly registryApiUrl: URL;

	constructor(
		readonly wallet: CantonWalletAdapter,
		readonly cantonConfig: CantonConfig,
		sdkOptions?: { sandbox?: boolean },
	) {
		this.apiService = new ZebecCardAPIService(sdkOptions?.sandbox ?? false);

		this.registryApiUrl = cantonConfig.registryApiUrl
			? new URL(cantonConfig.registryApiUrl.toString())
			: localNetStaticConfig.LOCALNET_REGISTRY_API_URL;

		this.cantonWalletSdk = new WalletSDKImpl().configure({
			logger: console,
			authFactory: createAuthFactory(
				cantonConfig.auth.configUrl,
				console,
				cantonConfig.auth.userId,
				cantonConfig.auth.userSecret,
				cantonConfig.auth.adminId,
				cantonConfig.auth.adminSecret,
				cantonConfig.auth.scope,
				cantonConfig.auth.audience,
			),
			ledgerFactory: createLedgerFactory(cantonConfig.ledgerApiUrl),
			validatorFactory: createValidatorFactory(cantonConfig.validatorAppApiUrl),
			tokenStandardFactory: createTokenStandardFactory(
				cantonConfig.ledgerApiUrl,
				cantonConfig.validatorAppApiUrl,
			),
		});
	}

	async connect(): Promise<void> {
		await this.cantonWalletSdk.connect();
	}

	async fetchVault(
		symbol = "CANTON",
	): Promise<{ address: string; tag?: string }> {
		return this.apiService.fetchVault(symbol);
	}

	private getTokenStandard(): TokenStandardController {
		const ts = this.cantonWalletSdk.tokenStandard;
		if (!ts) {
			throw new Error(
				"TokenStandardController is not initialized. Call connect() before transferring.",
			);
		}
		return ts;
	}

	/**
	 * Transfer native Canton coin (Amulet) to the Zebec vault.
	 *
	 * 1. Resolves the vault address for the "CANTON" symbol.
	 * 2. Builds the transfer command via the wallet-sdk token-standard.
	 * 3. Delegates signing and submission to the wallet adapter.
	 */
	async transferNative(params: NativeTransferParams): Promise<string> {
		const vault = await this.fetchVault("CANTON");
		const tokenStandard = this.getTokenStandard();

		tokenStandard.setTransferFactoryRegistryUrl(this.registryApiUrl);

		const [command, disclosedContracts] = await tokenStandard.createTransfer(
			this.wallet.partyId,
			vault.address,
			params.amount.toString(),
			{
				instrumentId: CANTON_NATIVE_INSTRUMENT_ID,
				instrumentAdmin:
					params.instrumentAdmin || DEVNET_CANTON_NATIVE_INSTRUMENT_ADMIN,
			},
			[],
			vault.tag ?? params.memo,
		);

		return this.wallet.executeTransaction(command, disclosedContracts);
	}

	/**
	 * Transfer a CIP-0056 standard token to the Zebec vault.
	 *
	 * 1. Resolves the vault address for the given instrument symbol.
	 * 2. Configures the token-standard with the appropriate registry URL.
	 * 3. Builds the transfer command via the wallet-sdk token-standard.
	 * 4. Delegates signing and submission to the wallet adapter.
	 */
	async transferToken(params: TokenTransferParams): Promise<string> {
		const vault = await this.fetchVault(params.instrumentId);
		const tokenStandard = this.getTokenStandard();

		const registryUrl = params.registryApiUrl
			? new URL(params.registryApiUrl.toString())
			: this.registryApiUrl;

		tokenStandard.setTransferFactoryRegistryUrl(registryUrl);

		const [command, disclosedContracts] = await tokenStandard.createTransfer(
			this.wallet.partyId,
			vault.address,
			params.amount.toString(),
			{
				instrumentId: params.instrumentId,
				instrumentAdmin: params.instrumentAdmin,
			},
			[],
			vault.tag ?? params.memo,
		);

		return this.wallet.executeTransaction(command, disclosedContracts);
	}
}
