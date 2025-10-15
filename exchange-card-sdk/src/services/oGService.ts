import { ethers } from "ethers";

import { ERC20__factory } from "../artifacts";
import { DEFAULT_EVM_GAS_LIMIT, OG_CHAIN_ID } from "../constants";
import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { OGChainId, Quote } from "../types";

export type TransferTokenParams = {
	amount: string | number;
	tokenAddress: string;
	symbol: string;
	overrides?: Omit<ethers.Overrides, "from" | "value" | "chainId">;
};

export class OGService {
	readonly network: "mainnet" | "testnet";
	readonly chainId: OGChainId;
	private apiService: ZebecCardAPIService;

	constructor(
		readonly signer: ethers.Signer,
		readonly apiConfig: APIConfig,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		this.network = sdkOptions?.sandbox ? "testnet" : "mainnet";
		this.chainId = OG_CHAIN_ID[this.network];
		this.apiService = new ZebecCardAPIService(apiConfig, sdkOptions?.sandbox || false);
	}

	/**
	 * Fetches a quote for Bitcoin transfer.
	 *
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote(symbol: string): Promise<Quote> {
		const res = await this.apiService.fetchQuote(symbol);
		return res;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol: string): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	async transferTokens(params: TransferTokenParams) {
		const tokenContract = ERC20__factory.connect(params.tokenAddress, this.signer);
		const tokenDecimals = await tokenContract.decimals();

		const parsedAmount = ethers.parseUnits(params.amount.toString(), tokenDecimals);

		const vault = await this.fetchVault(params.symbol);
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
		console.debug("OG Transaction Hash:", response.hash);

		const receipt = await response.wait();

		return receipt;
	}
}
