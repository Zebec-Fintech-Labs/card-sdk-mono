import {
	parseQuai,
	quais,
} from "quais";
import {
	QuaiTransactionRequest,
	TransactionRequest,
} from "quais/providers";

import {
	DEFAULT_EVM_GAS_LIMIT,
	QUAI_CHAIN_ID,
} from "../constants";
import {
	APIConfig,
	ZebecCardAPIService,
} from "../helpers/apiHelpers";
import {
	QuaiChainId,
	Quote,
} from "../types";

export type TransferQuaiParams = {
	amount: string | number;
	overrides?: Omit<QuaiTransactionRequest, "from" | "value" | "chainId">;
};

export class QuaiService {
	readonly network: "mainnet" | "testnet";
	readonly chainId: QuaiChainId;
	private apiService: ZebecCardAPIService;

	constructor(
		readonly signer: quais.Signer,
		readonly apiConfig: APIConfig,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		this.network = sdkOptions?.sandbox ? "testnet" : "mainnet";
		this.chainId = QUAI_CHAIN_ID[this.network];
		this.apiService = new ZebecCardAPIService(apiConfig, sdkOptions?.sandbox || false);
	}

	/**
	 * Fetches a quote for Bitcoin transfer.
	 *
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote(symbol: string): Promise<Quote> {
		const res = await this.apiService.fetchQuote(symbol);
		return res as Quote;
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

	async transferQuai(
		params: TransferQuaiParams,
	): Promise<quais.TransactionReceipt | quais.QiTransactionResponse | null> {
		const parsedAmount = parseQuai(params.amount.toString());

		const provider = this.signer.provider;

		const vault = await this.fetchVault("QUAI");
		const recipientAddress = vault.address;

		if (!provider) {
			throw new Error("There is no provider in signer instance.");
		}

		const senderBalance = await provider.getBalance(this.signer);

		if (senderBalance < parsedAmount) {
			throw new Error("Insufficient balance for transaction.");
		}

		const overides: TransactionRequest = {
			...params.overrides,
			gasLimit: params.overrides?.gasLimit ?? DEFAULT_EVM_GAS_LIMIT,
			from: this.signer,
		};

		const response = await this.signer.sendTransaction({
			...overides,
			to: recipientAddress,
			value: parsedAmount,
			from: this.signer,
			chainId: this.chainId,
		});

		console.debug("Quai Transaction Hash:", response.hash);
		const receipt = await response.wait();

		return receipt;
	}
}
