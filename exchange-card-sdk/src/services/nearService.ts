import assert from "assert";
import { BigNumber } from "bignumber.js";

import { JsonRpcProvider, Provider } from "@near-js/providers";
import { CodeResult, FinalExecutionOutcome } from "@near-js/types";
import { parseNearAmount } from "@near-js/utils";

import { NEAR_RPC_URL } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";

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
	signAndSendTransaction: (transaction: Transaction) => Promise<FinalExecutionOutcome>;
}

export class NearService {
	private apiService: ZebecCardAPIService;
	readonly provider: Provider;

	constructor(
		readonly wallet: NearWallet,
		options?: { sandbox?: boolean },
	) {
		const sandbox = options?.sandbox ? options.sandbox : false;
		this.apiService = new ZebecCardAPIService(sandbox);
		const url = sandbox ? NEAR_RPC_URL.Sandbox : NEAR_RPC_URL.Production;
		this.provider = new JsonRpcProvider({ url });
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
	}): Promise<FinalExecutionOutcome> {
		const signerId = params.signerId ? params.signerId : this.wallet.signerId;

		const fetchVault = await this.fetchVault();
		const destination = fetchVault.address;
		console.debug("destination:", destination);

		const parsedAmount = parseNearAmount(params.amount);
		assert(parsedAmount, "Amount might be missing.");

		const action: TransferAction = {
			type: "Transfer",
			params: {
				deposit: parsedAmount,
			},
		};

		const outcome = await this.wallet.signAndSendTransaction({
			signerId: signerId,
			receiverId: destination,
			actions: [action],
		});

		return outcome;
	}

	async registerAccountInTokenContract(params: { signerId?: string; tokenContractId: string }) {
		const signerId = params.signerId ? params.signerId : this.wallet.signerId;

		const storageBalanceBoundsResult = await this.provider.query<CodeResult>({
			request_type: "call_function",
			account_id: params.tokenContractId,
			method_name: "storage_balance_bounds",
			args_base64: Buffer.from(JSON.stringify({})).toString("base64"),
			finality: "optimistic",
		});

		const storageBalanceBounds = JSON.parse(
			Buffer.from(storageBalanceBoundsResult.result).toString(),
		);

		console.debug("storageBalanceBounds:", storageBalanceBounds);

		const storageBalanceResult = await this.provider.query<CodeResult>({
			request_type: "call_function",
			account_id: params.tokenContractId,
			method_name: "storage_balance_of",
			args_base64: Buffer.from(JSON.stringify({ account_id: signerId })).toString("base64"),
			finality: "optimistic",
		});

		const storageBalance = JSON.parse(Buffer.from(storageBalanceResult.result).toString());

		console.debug("storageBalance:", storageBalance);

		const GAS = "30000000000000";

		if (
			!storageBalance ||
			BigNumber(storageBalance.available).isLessThan(storageBalanceBounds.min)
		) {
			const action = createFunctionCall(
				"storage_deposit",
				{
					account_id: signerId,
					registration_only: false,
				},
				GAS,
				storageBalanceBounds.min,
			);

			const outcome = await this.wallet.signAndSendTransaction({
				signerId: signerId,
				receiverId: params.tokenContractId,
				actions: [action],
			});

			return outcome;
		}

		return null;
	}

	async transferTokens(params: {
		signerId?: string;
		amount: string;
		tokenContractId: string;
	}): Promise<FinalExecutionOutcome> {
		const signerId = params.signerId ? params.signerId : this.wallet.signerId;
		console.log("signerId:", signerId);

		const fetchVault = await this.fetchVault("NEAR-USDC");
		const destination = fetchVault.address;
		console.debug("destination:", destination);

		let actions: Action[] = [];

		const GAS = "30000000000000";

		const storageBalanceBoundsResult = await this.provider.query<CodeResult>({
			request_type: "call_function",
			account_id: params.tokenContractId,
			method_name: "storage_balance_bounds",
			args_base64: Buffer.from(JSON.stringify({})).toString("base64"),
			finality: "optimistic",
		});

		const storageBalanceBounds = JSON.parse(
			Buffer.from(storageBalanceBoundsResult.result).toString(),
		);

		console.debug("storageBalanceBounds:", storageBalanceBounds);

		const storageBalanceResult = await this.provider.query<CodeResult>({
			request_type: "call_function",
			account_id: params.tokenContractId,
			method_name: "storage_balance_of",
			args_base64: Buffer.from(JSON.stringify({ account_id: destination })).toString("base64"),
			finality: "optimistic",
		});

		const storageBalance = JSON.parse(Buffer.from(storageBalanceResult.result).toString());

		console.debug("storageBalance:", storageBalance);

		if (
			!storageBalance ||
			BigNumber(storageBalance.available).isLessThan(storageBalanceBounds.min)
		) {
			const action = createFunctionCall(
				"storage_deposit",
				{
					account_id: destination,
					registration_only: false,
				},
				GAS,
				storageBalanceBounds.max ? storageBalanceBounds.max : storageBalanceBounds.min,
			);

			actions.push(action);
		}

		const metadataResult = await this.provider.query<CodeResult>({
			request_type: "call_function",
			finality: "final",
			account_id: params.tokenContractId,
			method_name: "ft_metadata",
			args_base64: Buffer.from(JSON.stringify({})).toString("base64"),
		});
		const metadata = JSON.parse(Buffer.from(metadataResult.result).toString());

		const tokenDecimals = metadata.decimals;

		const parsedAmount = BigNumber(params.amount)
			.times(BigNumber(10).pow(tokenDecimals))
			.toFixed(0);
		const secutityDeposit = "1";

		const transferAction = createFunctionCall(
			"ft_transfer",
			{
				receiver_id: destination,
				amount: parsedAmount,
				memo: null,
			},
			GAS,
			secutityDeposit,
		);

		actions.push(transferAction);

		const outcome = await this.wallet.signAndSendTransaction({
			signerId: signerId,
			receiverId: params.tokenContractId,
			actions,
		});

		return outcome;
	}

	async getNearBalance(params: { signerId?: string }) {
		const signerId = params.signerId ? params.signerId : this.wallet.signerId;

		const result = await this.provider.query({
			request_type: "view_account",
			account_id: signerId,
			finality: "final",
		});

		return { ...result };
	}

	async getTokenBalance(params: { tokenContractId: string; signerId?: string }) {
		const signerId = params.signerId ? params.signerId : this.wallet.signerId;
		const metadataResult = await this.provider.query<CodeResult>({
			request_type: "call_function",
			finality: "final",
			account_id: params.tokenContractId,
			method_name: "ft_metadata",
			args_base64: Buffer.from(JSON.stringify({})).toString("base64"),
		});

		const result = await this.provider.query<CodeResult>({
			request_type: "call_function",
			finality: "final",
			account_id: params.tokenContractId,
			method_name: "ft_balance_of",
			args_base64: Buffer.from(
				JSON.stringify({
					account_id: signerId,
				}),
			).toString("base64"),
		});

		const metadata = JSON.parse(Buffer.from(metadataResult.result).toString());
		const decimals = metadata.decimals;

		const data = JSON.parse(Buffer.from(result.result).toString());

		return BigNumber(data).div(BigNumber(10).pow(decimals)).toFixed();
	}
}
