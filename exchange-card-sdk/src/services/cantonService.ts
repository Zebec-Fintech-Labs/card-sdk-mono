import {
	type AuthTokenProvider,
	LedgerController,
	localNetStaticConfig,
	TokenStandardController,
	ValidatorController,
	type WalletSDK,
	WalletSDKImpl,
} from "@canton-network/wallet-sdk";

import { ZebecCardAPIService } from "../helpers/apiHelpers";

export interface CantonWallet {
	partyId: string;
	executeTransaction: (command: unknown, disclosedContractId: unknown[]) => Promise<string>;
}

export interface CantonConfig {
	ledgerApiUrl: string;
	validatorAppApiUrl: string;
}

export function createLedgerFactory(ledgerApiUrl: string) {
	return (userId: string, authTokenProvider: AuthTokenProvider, isAdmin: boolean) => {
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
		return new ValidatorController(userId, new URL(validatorAppApiUrl), authTokenProvider);
	};
}

export function createTokenStandardFactory(ledgerApiUrl: string, validatorAppApiUrl: string) {
	return (userId: string, authTokenProvider: AuthTokenProvider, isAdmin: boolean) => {
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

export class CantonService {
	readonly cantonWalletSdk: WalletSDK;
	private apiService: ZebecCardAPIService;
	constructor(
		readonly wallet: CantonWallet,
		readonly cantonConfig: CantonConfig,
		sdkOptions?: { sandbox?: boolean },
	) {
		this.apiService = new ZebecCardAPIService(sdkOptions?.sandbox || false);
		this.cantonWalletSdk = new WalletSDKImpl().configure({
			logger: console,
			ledgerFactory: createLedgerFactory(cantonConfig.ledgerApiUrl),
			validatorFactory: createValidatorFactory(cantonConfig.validatorAppApiUrl),
			tokenStandardFactory: createTokenStandardFactory(
				cantonConfig.ledgerApiUrl,
				cantonConfig.validatorAppApiUrl,
			),
		});
	}

	async connect() {
		await this.cantonWalletSdk.connect();
	}

	async fetchVault(symbol = "CANTON"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	// methods for transfering natve assets
	async transferNative(params: {
		amount: number | string;
		instrumentId: string;
		instrumentAdmin: string;
	}) {
		const vault = await this.fetchVault("CANTON");

		const sender = this.wallet.partyId;
		const receiver = vault.address;
		const memo = vault.tag;

		// implement transfer logic here
		this.cantonWalletSdk.tokenStandard?.setTransferFactoryRegistryUrl(
			localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
		);

		const [transferCommand, disclosedContracts] =
			// biome-ignore lint/style/noNonNullAssertion: we can be sure that tokenStandard is defined here since we set its factory in the SDK constructor
			await this.cantonWalletSdk.tokenStandard!.createTransfer(
				sender,
				receiver,
				params.amount.toString(),
				{
					instrumentId: params.instrumentId,
					instrumentAdmin: params.instrumentAdmin,
				},
				[],
				memo,
			);

		return this.wallet.executeTransaction(transferCommand, disclosedContracts);
	}
}
