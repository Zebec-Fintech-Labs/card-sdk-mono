import { parseQuai } from "quais";
import { QuaiTransactionRequest } from "quais/providers";

import { DEFAULT_QUAI_GAS_LIMIT } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";

export type TransferQuaiParams = {
	amount: string | number;
	overrides?: Omit<QuaiTransactionRequest, "from" | "value" | "chainId">;
};

export type QuaiWallet = {
	address: string;
	signAndSendTransaction: (tx: QuaiTransactionRequest) => Promise<string>;
};

export class QuaiService {
	private apiService: ZebecCardAPIService;

	constructor(
		readonly signer: QuaiWallet,
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
	async fetchVault(symbol: string): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	async transferQuai(params: TransferQuaiParams): Promise<string> {
		const parsedAmount = parseQuai(params.amount.toString());

		const vault = await this.fetchVault("QUAI");
		const recipientAddress = vault.address;

		const request: QuaiTransactionRequest = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit ?? DEFAULT_QUAI_GAS_LIMIT,
			// gasPrice: params.overrides?.gasPrice ?? DEFAULT_QUAI_GAS_PRICE,
			from: this.signer.address,
			to: recipientAddress,
			value: parsedAmount,
		};

		const hash = await this.signer.signAndSendTransaction(request);

		return hash;
	}
}
