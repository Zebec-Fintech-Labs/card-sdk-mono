import { BigNumber } from "bignumber.js";

import { JsonRpcProvider, Provider } from "@near-js/providers";
import { NEAR_NOMINATION_EXP } from "@near-js/utils";

import { NEAR_RPC_URL } from "../constants";
import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { Quote } from "../types";

export interface CreateAccountAction {
	type: "CreateAccount";
}

export interface DeployContractAction {
	type: "DeployContract";
	params: {
		code: Uint8Array;
	};
}

export interface FunctionCallAction {
	type: "FunctionCall";
	params: {
		methodName: string;
		args: object;
		gas: string;
		deposit: string;
	};
}

export interface TransferAction {
	type: "Transfer";
	params: {
		deposit: string;
	};
}

export interface StakeAction {
	type: "Stake";
	params: {
		stake: string;
		publicKey: string;
	};
}

export type AddKeyPermission =
	| "FullAccess"
	| {
			receiverId: string;
			methodNames: Array<string>;
			allowance?: string;
	  };

export interface AddKeyAction {
	type: "AddKey";
	params: {
		publicKey: string;
		accessKey: {
			nonce?: number;
			permission: AddKeyPermission;
		};
	};
}

export interface DeleteKeyAction {
	type: "DeleteKey";
	params: {
		publicKey: string;
	};
}

export interface DeleteAccountAction {
	type: "DeleteAccount";
	params: {
		beneficiaryId: string;
	};
}

export type Action =
	| CreateAccountAction
	| DeployContractAction
	| FunctionCallAction
	| TransferAction
	| StakeAction
	| AddKeyAction
	| DeleteKeyAction
	| DeleteAccountAction;

export type ActionType = Action["type"];

/**
 * Makes action payload for function call in near contract
 * @param methodName method name
 * @param args an object that will be passed as argument to method
 * @param gas gas fee
 * @param deposit deposit amount
 */
export function createFunctionCall(
	methodName: string,
	args: object,
	gas: string,
	deposit: string,
): FunctionCallAction {
	return {
		type: "FunctionCall",
		params: {
			args,
			deposit,
			gas,
			methodName,
		},
	};
}

export interface Transaction {
	signerId: string;
	receiverId: string;
	actions: Array<Action>;
}

export interface NearWallet {
	signerId: string;
	signAndSendTransaction: (
		transaction: Transaction,
	) => Promise<{ transaction: Transaction; signature: string }>;
}

export class XRPLService {
	private apiService: ZebecCardAPIService;
	readonly provider: Provider;

	constructor(
		readonly wallet: NearWallet,
		apiConfig: APIConfig,
		options?: { sandbox?: boolean },
	) {
		const sandbox = options?.sandbox ? options.sandbox : false;
		this.apiService = new ZebecCardAPIService(apiConfig, sandbox);
		const url = sandbox ? NEAR_RPC_URL.Sandbox : NEAR_RPC_URL.Production;
		this.provider = new JsonRpcProvider({ url });
	}

	/**
	 * Fetches a quote for Bitcoin transfer.
	 *
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote(symbol = "NEAR"): Promise<Quote> {
		const res = await this.apiService.fetchQuote(symbol);
		return res as Quote;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault(symbol = "NEAR"): Promise<{ address: string; tag?: string }> {
		const data = await this.apiService.fetchVault(symbol);
		return data;
	}

	async transferNear(params: {
		signerId?: string;
		amount: string;
	}): Promise<{ signature: string }> {
		console.debug("walletAddress:", params.signerId);
		const signerId = params.signerId ? params.signerId : this.wallet.signerId;

		const fetchVault = await this.fetchVault();
		const destination = fetchVault.address;
		console.debug("destination:", destination);

		const parsedAmount = BigNumber(params.amount)
			.times(BigNumber(10).pow(NEAR_NOMINATION_EXP))
			.toFixed(0);

		const action: TransferAction = {
			type: "Transfer",
			params: {
				deposit: parsedAmount,
			},
		};

		const { signature } = await this.wallet.signAndSendTransaction({
			signerId: signerId,
			receiverId: destination,
			actions: [action],
		});

		return { signature };
	}

	async transferTokens(params: {
		signerId?: string;
		amount: string;
		tokenContractId: string;
	}): Promise<{ signature: string }> {
		const signerId = params.signerId ? params.signerId : this.wallet.signerId;
		console.log("walletAddress:", params.signerId);

		const fetchVault = await this.fetchVault("NEAR_USD");
		const destination = fetchVault.address;
		console.log("destination:", destination);

		const USDC_DECIMALS = 6;
		const parsedAmount = BigNumber(params.amount)
			.times(BigNumber(10).pow(USDC_DECIMALS))
			.toFixed(0);
		const GAS = "30000000000000";
		const secutityDeposit = "1";

		const action = createFunctionCall(
			"ft_transfer",
			{
				receiver_id: destination,
				amount: parsedAmount,
				memo: null,
			},
			GAS,
			secutityDeposit,
		);

		const { signature } = await this.wallet.signAndSendTransaction({
			signerId: signerId,
			receiverId: params.tokenContractId,
			actions: [action],
		});

		return { signature };
	}
}
