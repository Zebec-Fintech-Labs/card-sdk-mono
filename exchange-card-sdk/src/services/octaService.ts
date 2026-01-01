import { ethers, parseEther } from "ethers";

import { DEFAULT_EVM_GAS_LIMIT } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";

export type TransferOctaParams = {
	amount: string | number;
	overrides?: Omit<ethers.Overrides, "from" | "value" | "chainId">;
};

export class OctaService {
	private apiService: ZebecCardAPIService;

	constructor(
		readonly signer: ethers.Signer,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		this.apiService = new ZebecCardAPIService(sdkOptions?.sandbox || false);
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol = "OCTA"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	async transferOcta(params: TransferOctaParams): Promise<ethers.TransactionReceipt | null> {
		const parsedAmount = parseEther(params.amount.toString());

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
			chainId: 800001,
		});
		console.debug("Octa Transaction Hash:", response.hash);

		const receipt = await response.wait();

		return receipt;
	}
}
