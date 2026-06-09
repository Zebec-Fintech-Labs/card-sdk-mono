import { ethers } from "ethers";

import { ERC20__factory } from "../artifacts";
import { BOBA_CHAIN_ID, DEFAULT_EVM_GAS_LIMIT } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";
import type { BobaChainId } from "../types";

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
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		this.network = sdkOptions?.sandbox ? "testnet" : "mainnet";
		this.chainId = BOBA_CHAIN_ID[this.network];
		this.apiService = new ZebecCardAPIService(sdkOptions?.sandbox || false);
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVaultByTokenAddress(address: string): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVaultByTokenAddress(address);
		return data;
	}

	async transferBobaEth(params: TransferBobaParams): Promise<ethers.TransactionReceipt | null> {
		const parsedAmount = ethers.parseEther(params.amount.toString());

		const provider = this.signer.provider;

		const vault = await this.fetchVaultByTokenAddress("boba-eth");
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

		const vault = await this.fetchVaultByTokenAddress(params.tokenAddress);
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
