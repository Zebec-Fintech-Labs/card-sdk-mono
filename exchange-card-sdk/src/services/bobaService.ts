import { ethers } from "ethers";

import { ERC20__factory } from "../artifacts";
import { BOBA_CHAIN_ID, DEFAULT_EVM_GAS_LIMIT } from "../constants";
import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { BobaChainId, Quote } from "../types";

export type TransferBobaParams = {
	amount: string | number;
	overrides?: Omit<ethers.Overrides, "from" | "value" | "chainId">;
};

export type TransferTokenParams = {
	amount: string | number;
	tokenAddress: string;
	overrides?: Omit<ethers.Overrides, "from" | "value" | "chainId">;
};

export class BobaService {
	readonly network: "mainnet" | "testnet";
	readonly chainId: BobaChainId;
	private readonly apiService: ZebecCardAPIService;

	constructor(
		readonly signer: ethers.Signer,
		readonly apiConfig: APIConfig,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		this.network = sdkOptions?.sandbox ? "testnet" : "mainnet";
		this.chainId = BOBA_CHAIN_ID[this.network];
		this.apiService = new ZebecCardAPIService(apiConfig, sdkOptions?.sandbox || false);
	}

	/**
	 * Fetches a quote for Bitcoin transfer.
	 *
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote(symbol = "BOBA"): Promise<Quote> {
		const res = await this.apiService.fetchQuote(symbol);
		return res;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol = "BOBA"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	async transferBobaEth(params: TransferBobaParams): Promise<ethers.TransactionReceipt | null> {
		const parsedAmount = ethers.parseEther(params.amount.toString());

		const provider = this.signer.provider;

		const vault = await this.fetchVault();
		const recipientAddress = vault.address;

		if (!provider) {
			throw new Error("There is no provider in signer instance.");
		}

		const senderBalance = await provider.getBalance(this.signer);

		if (senderBalance < parsedAmount) {
			throw new Error("Insufficient balance for transaction.");
		}

		const overides: ethers.Overrides = {
			gasLimit: DEFAULT_EVM_GAS_LIMIT,
			...params.overrides,
		};

		const response = await this.signer.sendTransaction({
			...overides,
			to: recipientAddress,
			value: parsedAmount,
			from: this.signer,
			chainId: this.chainId,
		});
		console.debug("Boba Transaction Hash:", response.hash);

		const receipt = await response.wait();

		return receipt;
	}

	async transferToken(params: TransferTokenParams): Promise<ethers.TransactionReceipt | null> {
		const tokenContract = ERC20__factory.connect(params.tokenAddress, this.signer);
		const tokenDecimals = await tokenContract.decimals();

		const parsedAmount = ethers.parseUnits(params.amount.toString(), tokenDecimals);

		const vault = await this.fetchVault();
		const recipientAddress = vault.address;

		const senderBalance = await tokenContract.balanceOf(this.signer);

		if (senderBalance < parsedAmount) {
			throw new Error("Insufficient balance for transaction.");
		}

		const overides: ethers.Overrides = {
			gasLimit: DEFAULT_EVM_GAS_LIMIT,
			...params.overrides,
			chainId: this.chainId,
		};

		const response = await tokenContract.transfer(recipientAddress, parsedAmount, overides);
		console.debug("Boba Transaction Hash:", response.hash);

		const receipt = await response.wait();

		return receipt;
	}
}
