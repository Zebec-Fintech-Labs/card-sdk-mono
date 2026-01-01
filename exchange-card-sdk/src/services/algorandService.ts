import algosdk from "algosdk";

import { ALGORAND_RPC_URL } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";
import {
	formatAlgo,
	formatAlgorandAsset,
	getAssetDecimals,
	parseAlgo,
	parseAlgorandAsset,
} from "../utils";

/**
 * Configuration interface for algo transfers
 * */
export interface TransferConfig {
	amount: number | string; // Amount in Algos
	note?: string;
}

/**
 * Configuration interface for USDC transfers
 * */
export interface TokenTransferConfig {
	/** Asset ID for Asset (e.g. for USDC 31566704) */
	assetId: number;
	amount: number | string; // Amount in USDC
	note?: string;
}

export interface AlgorandWallet {
	address: string;
	signAndSendTransaction: (txn: algosdk.Transaction) => Promise<string>;
}

export class AlgorandService {
	readonly algodClient: algosdk.Algodv2;
	private apiService: ZebecCardAPIService;

	constructor(
		readonly wallet: AlgorandWallet,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		const rpcUrl = ALGORAND_RPC_URL[sdkOptions?.sandbox ? "Sandbox" : "Production"];
		this.algodClient = new algosdk.Algodv2({}, rpcUrl, 443);
		this.apiService = new ZebecCardAPIService(sdkOptions?.sandbox || false);
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol = "ALGO"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	/**
	 * Transfer Algorand currency from one wallet to another
	 * @param config Transfer configuration
	 * @returns Transaction ID if successful
	 */
	async transferAlgo(config: TransferConfig): Promise<string> {
		try {
			const parsedAmount = parseAlgo(config.amount);

			// Check if sender has sufficient balance
			const senderBalance = await this.getAccountBalanceInMicroAlgo(this.wallet.address);
			const minBalance = parseAlgo(0.1); // Minimum account balance

			if (senderBalance < parsedAmount + minBalance) {
				throw new Error(
					`Insufficient balance. Need ${formatAlgo(parsedAmount + minBalance)} ALGO, have ${formatAlgo(senderBalance)} ALGO`,
				);
			}

			const vault = await this.fetchVault("ALGO");
			const recipientAddress = vault.address;

			// Validate recipient address
			if (!algosdk.isValidAddress(recipientAddress)) {
				throw new Error("Invalid recipient address");
			}

			// Get suggested transaction parameters
			const suggestedParams = await this.algodClient.getTransactionParams().do();

			// Create payment transaction
			const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
				sender: this.wallet.address,
				receiver: recipientAddress,
				amount: parsedAmount,
				note: config.note ? new Uint8Array(Buffer.from(config.note)) : undefined,
				suggestedParams: suggestedParams,
			});

			// Sign the transaction
			const txId = await this.wallet.signAndSendTransaction(paymentTxn);

			return txId;
		} catch (error) {
			console.error("Transfer failed:", error);
			throw error;
		}
	}

	/**
	 * Transfer USDC (ASA token) from wallet to vault
	 * @param config USDC transfer configuration
	 * @returns Transaction ID if successful
	 */
	async transferAsset(config: TokenTransferConfig) {
		try {
			const assetDecimals = await getAssetDecimals(this.algodClient, config.assetId);
			// const usdcConfig = USDC_ASSET_CONFIG[this.network];
			const parsedAmount = parseAlgorandAsset(config.amount, assetDecimals);

			// Check if sender has sufficient USDC balance
			const senderAssetBalance = await this.getAssetBalanceInMicroUnit(
				this.wallet.address,
				config.assetId,
			);

			if (senderAssetBalance < parsedAmount) {
				throw new Error(
					`Insufficient Asset balance. Need ${formatAlgorandAsset(parsedAmount, assetDecimals)} Asset, have ${formatAlgorandAsset(senderAssetBalance, assetDecimals)} Asset`,
				);
			}

			// Check if sender has sufficient ALGO for transaction fees
			const senderAlgoBalance = await this.getAccountBalanceInMicroAlgo(this.wallet.address);
			const minAlgoForFees = parseAlgo(0.002); // Minimum ALGO for transaction fees

			if (senderAlgoBalance < minAlgoForFees) {
				throw new Error(
					`Insufficient ALGO for transaction fees. Need at least ${formatAlgo(minAlgoForFees)} ALGO for fees`,
				);
			}

			const vault = await this.fetchVault("ALGO-USDC");
			const recipientAddress = vault.address;

			// Validate recipient address
			if (!algosdk.isValidAddress(recipientAddress)) {
				throw new Error("Invalid recipient address");
			}

			// // Check if recipient is opted into USDC asset
			const recipientOptedIn = await this.isOptedIntoAsset(recipientAddress, config.assetId);
			if (!recipientOptedIn) {
				throw new Error("Recipient address is not opted into USDC asset");
			}

			// Get suggested transaction parameters
			const suggestedParams = await this.algodClient.getTransactionParams().do();

			// Create asset transfer transaction
			const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
				sender: this.wallet.address,
				receiver: recipientAddress,
				amount: parsedAmount,
				assetIndex: config.assetId,
				note: config.note ? new Uint8Array(Buffer.from(config.note)) : undefined,
				suggestedParams: suggestedParams,
			});

			// Sign and send the transaction
			const txId = await this.wallet.signAndSendTransaction(assetTransferTxn);

			return txId;
		} catch (error) {
			console.error("Asset transfer failed:", error);
			throw error;
		}
	}

	/**
	 * Check if an account is opted into a specific asset
	 * @param address Account address
	 * @param assetId Asset ID to check
	 * @returns Whether the account is opted into the asset
	 */
	async isOptedIntoAsset(address: string, assetId: number): Promise<boolean> {
		try {
			const accountInfo = await this.algodClient.accountInformation(address).do();
			return accountInfo.assets?.some((asset) => asset.assetId === BigInt(assetId)) || false;
		} catch (error) {
			console.error("Error checking asset opt-in status:", error);
			return false;
		}
	}

	/**
	 * Get asset balance for a specific account in microAsset (base units)
	 * @param address Account address
	 * @param assetId Asset ID
	 * @returns Asset balance in base units
	 */
	private async getAssetBalanceInMicroUnit(
		walletAddress: string,
		assetId: number,
	): Promise<bigint> {
		try {
			const accountInfo = await this.algodClient.accountInformation(walletAddress).do();
			const asset = accountInfo.assets?.find((asset) => asset.assetId === BigInt(assetId));
			return asset ? BigInt(asset.amount) : BigInt(0);
		} catch (error) {
			console.error("Error fetching asset balance:", error);
			return BigInt(0);
		}
	}

	async getAssetBalance(walletAddress: string, assetId: number): Promise<string> {
		const balance = await this.getAssetBalanceInMicroUnit(walletAddress, assetId);
		const decimals = await getAssetDecimals(this.algodClient, assetId);

		return formatAlgorandAsset(balance, decimals);
	}

	async getAssetsBalance(walletAddress: string, assetIds: number[]): Promise<Map<number, string>> {
		const map = new Map<number, string>(Array.from(assetIds.map((id) => [id, "0"])));
		try {
			const accountInfo = await this.algodClient.accountInformation(walletAddress).do();
			const assets = accountInfo.assets;
			if (!assets) {
				return map;
			}

			await Promise.all(
				assetIds.map(async (id) => {
					const asset = assets.find((asset) => asset.assetId === BigInt(id));
					if (asset) {
						const decimals = await getAssetDecimals(this.algodClient, id);
						const amount = formatAlgorandAsset(asset.amount, decimals);
						map.set(id, amount);
					}
				}),
			);
			return map;
		} catch (error) {
			console.error("Error fetching asset balance:", error);
		}
		return map;
	}

	/**
	 * Get account balance in Algos
	 * @param address Account address
	 * @returns Balance in ALGO
	 */
	async getAccountBalance(address: string | algosdk.Address): Promise<string> {
		const amount = await this.getAccountBalanceInMicroAlgo(address);
		return formatAlgo(amount);
	}

	/**
	 * Get account balance in microAlgos (for internal calculations)
	 * @param address Account address
	 * @returns Balance in microAlgos
	 */
	private async getAccountBalanceInMicroAlgo(address: string | algosdk.Address): Promise<bigint> {
		const accountInfo = await this.algodClient.accountInformation(address).do();
		return accountInfo.amount;
	}
}
