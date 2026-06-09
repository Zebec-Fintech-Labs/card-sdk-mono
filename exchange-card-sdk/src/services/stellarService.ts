import {
	Asset,
	Horizon,
	Memo,
	Networks,
	Operation,
	TimeoutInfinite,
	TransactionBuilder,
} from "@stellar/stellar-sdk";

import { STELLAR_RPC_URL, STELLAR_USDC_ISSUER } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";

export interface StellarWallet {
	address: string;
	signTransaction: (txXdr: string) => Promise<string>;
}
export class StellarService {
	private apiService: ZebecCardAPIService;
	readonly server: Horizon.Server;
	private sandbox: boolean;

	/**
	 * Constructs an instance of the service.
	 *
	 * @param {DigitalBitsSdk.Keypair} signer - The signer keypair for the DigitalBits wallet.
	 * @param {APIConfig} apiConfig - The configuration object for the API.
	 * @param sdkOptions - Optional configuration for the SDK.
	 */
	constructor(
		readonly wallet: StellarWallet,
		sdkOptions?: {
			sandbox?: boolean;
			apiKey?: string;
		},
	) {
		const sandbox = sdkOptions?.sandbox ? sdkOptions.sandbox : false;
		this.apiService = new ZebecCardAPIService(sandbox);
		this.server = new Horizon.Server(
			sandbox ? STELLAR_RPC_URL.Sandbox : STELLAR_RPC_URL.Production,
		);
		this.sandbox = sandbox;
	}

	/**
	 * Fetches the Vault address.
	 *
	 * @returns A promise that resolves to the Vault address.
	 */
	async fetchVaultByAsset(asset: string) {
		const data = await this.apiService.fetchVaultByTokenAddress(asset);
		return data;
	}

	/**
	 * Purchases a card by transferring XDB tokens.
	 *
	 * @param amount - The amount required to purchase a card.
	 * @returns A promise that resolves to an array containing the transaction details and the API response.
	 * @throws If the recipient's email address is invalid.
	 * @throws If the quote is invalid or expired, if there is not enough balance, or if the transaction fails.
	 */
	async transferXLM(amount: string): Promise<string> {
		// Fetch deposit address
		const vault = await this.fetchVaultByAsset(
			"CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
		);

		// Prepare transaction
		const account = await this.server.loadAccount(this.wallet.address);
		const fee = await this.server.fetchBaseFee();

		const memo = Memo.id(vault.tag?.toString() || "0");

		// Check Wallet balance
		const balance = await this.getWalletBalance(this.wallet.address);
		if (Number(balance) < Number(amount)) {
			throw new Error("Insufficient balance");
		}

		// Build and submit transaction
		const transaction = new TransactionBuilder(account, {
			fee: fee.toString(),
			networkPassphrase: this.sandbox ? Networks.TESTNET : Networks.PUBLIC,
		})
			.addOperation(
				Operation.payment({
					destination: vault.address,
					asset: Asset.native(),
					amount,
				}),
			)
			.addMemo(memo)
			.setTimeout(TimeoutInfinite)
			.build();

		// Sign the transaction
		const signedTxXdr = await this.wallet.signTransaction(transaction.toXDR());
		const tx = TransactionBuilder.fromXDR(
			signedTxXdr,
			this.sandbox ? Networks.TESTNET : Networks.PUBLIC,
		);

		let retries = 0;
		const maxRetries = 5;
		let delay = 1000;

		while (retries < maxRetries) {
			try {
				const transactionResult = await this.server.submitTransaction(tx, {
					skipMemoRequiredCheck: false,
				});
				const txHash = transactionResult.hash;
				return txHash;
			} catch (error) {
				console.debug("error: ", error);

				if (retries >= maxRetries) {
					throw error;
				}

				retries += 1;
				console.debug(`Retrying in ${delay / 1000} seconds...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay *= 2; // Exponential backoff
			}
		}

		throw new Error("Max retries reached");
	}

	/**
	 * Transfers USDC tokens.
	 *
	 * @param amount - The amount of USDC to transfer.
	 * @returns A promise that resolves to the transaction hash.
	 * @throws If there is not enough USDC balance or if the transaction fails.
	 */
	async transferUSDC(amount: string): Promise<string> {
		// Create USDC asset object
		const usdcAsset = new Asset(
			"USDC",
			this.sandbox ? STELLAR_USDC_ISSUER.Sandbox : STELLAR_USDC_ISSUER.Production,
		);
		// Fetch deposit address
		const vault = await this.fetchVaultByAsset(`${usdcAsset.code}:${usdcAsset.issuer}`);

		// Prepare transaction
		const account = await this.server.loadAccount(this.wallet.address);
		const fee = await this.server.fetchBaseFee();

		// Check Wallet balance
		const balance = await this.getTokenBalance(this.wallet.address, usdcAsset);
		if (Number(balance) < Number(amount)) {
			throw new Error("Insufficient USDC balance");
		}

		// Build and submit transaction
		const transaction = new TransactionBuilder(account, {
			fee: fee.toString(),
			networkPassphrase: this.sandbox ? Networks.TESTNET : Networks.PUBLIC,
		})
			.addOperation(
				Operation.payment({
					destination: vault.address,
					asset: usdcAsset,
					amount,
				}),
			)
			.setTimeout(TimeoutInfinite)
			.build();

		// Sign the transaction
		const signedTxXdr = await this.wallet.signTransaction(transaction.toXDR());
		const tx = TransactionBuilder.fromXDR(
			signedTxXdr,
			this.sandbox ? Networks.TESTNET : Networks.PUBLIC,
		);

		let retries = 0;
		const maxRetries = 5;
		let delay = 1000;

		while (retries < maxRetries) {
			try {
				const transactionResult = await this.server.submitTransaction(tx, {
					skipMemoRequiredCheck: false,
				});
				const txHash = transactionResult.hash;
				return txHash;
			} catch (error) {
				console.debug("error: ", error);

				if (retries >= maxRetries) {
					throw error;
				}

				retries += 1;
				console.debug(`Retrying in ${delay / 1000} seconds...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay *= 2; // Exponential backoff
			}
		}

		throw new Error("Max retries reached");
	}

	/**
	 * Retrieves the balance of the specified wallet.
	 *
	 * @param wallet - The public key of the wallet to get the balance for.
	 * @returns - A promise that resolves to the balance of the wallet.
	 */
	async getWalletBalance(wallet: string) {
		const account = await this.server.loadAccount(wallet);
		const nativeBalance = account.balances.find((balance) => balance.asset_type === "native");
		return nativeBalance ? nativeBalance.balance : "0";
	}

	/**
	 * Retrieves the balance of a specific token for the specified wallet.
	 *
	 * @param wallet - The public key of the wallet to get the token balance for.
	 * @param asset - The asset object representing the token.
	 * @returns A promise that resolves to the balance of the token.
	 */
	async getTokenBalance(wallet: string, asset: Asset): Promise<string> {
		const account = await this.server.loadAccount(wallet);
		try {
			const balance =
				account.balances.find(
					(b) =>
						b.asset_type !== "native" &&
						b.asset_type !== "liquidity_pool_shares" &&
						b.asset_code === asset.getCode(),
				)?.balance || "0";
			return balance;
		} catch (error) {
			console.debug(`Error fetching ${asset.getCode()} balance:`, error);
			return "0";
		}
	}

	async getAsset(assetCode: string, assetIssuer: string) {
		return new Asset(assetCode, assetIssuer);
	}
}
