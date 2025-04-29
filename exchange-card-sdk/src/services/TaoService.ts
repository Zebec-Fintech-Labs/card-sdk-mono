import { ApiPromise, WsProvider } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { Signer } from "@polkadot/types/types";

import { TAO_RPC_URL } from "../constants";
import { APIConfig, ZebecCardAPIService } from "../helpers/apiHelpers";
import { Quote } from "../types";

export class ZebecCardTAOService {
	private apiService: ZebecCardAPIService;
	private taoRPC: string;
	/**
	 * Constructs an instance of the service.
	 *
	 * @param {Signer} signer - The signer which can be either a PolkadotJs Signer or a KeyringPair.
	 * @param {APIConfig} apiConfig - The configuration object for the API.
	 * @param sdkOptions - Optional configuration for the SDK.
	 */
	constructor(
		readonly signer: Signer | KeyringPair,
		apiConfig: APIConfig,
		sdkOptions?: {
			sandbox?: boolean;
		},
	) {
		const sandbox = sdkOptions?.sandbox ? sdkOptions.sandbox : false;
		this.apiService = new ZebecCardAPIService(apiConfig, sandbox);
		this.taoRPC = sandbox ? TAO_RPC_URL.Sandbox : TAO_RPC_URL.Production;
	}

	/**
	 * Fetches a quote for the given amount.
	 *
	 * @param {string | number} amount - The amount for which to fetch the quote.
	 * @returns {Promise<Quote>} A promise that resolves to a Quote object.
	 */
	async fetchQuote() {
		const res = await this.apiService.fetchQuote("TAO");
		return res as Quote;
	}

	/**
	 * Fetches the TAO Vault address.
	 *
	 * @returns {Promise<string>} A promise that resolves to the TAO Vault address.
	 */
	async fetchTAOVault() {
		const data = await this.apiService.fetchVault("TAO");
		return data.address;
	}

	/**
	 * Executes TAO token transfer for card purchase.
	 *
	 * @param params - The parameters required for token transfer.
	 * @param params.walletAddress - The wallet address from which TAO tokens will be transferred.
	 * @param params.amount - The amount of TAO tokens to transfer.
	 * @param params.depositAddress - The destination address to receive tokens.
	 * @returns A promise that resolves to an object containing transaction and block hashes.
	 * @throws {Error} If there is not enough balance or if the transaction fails.
	 */
	async transferTAO(params: {
		walletAddress: string;
		amount: number;
	}): Promise<{ txHash: string; blockHash: string }> {
		// Connect to TAO network
		const provider = new WsProvider(this.taoRPC);
		const api = await ApiPromise.create({ provider });

		try {
			// Calculate total amount with proper decimal places
			const totalAmount = Math.floor(params.amount * 10 ** 9);

			// Check wallet balance
			const balance: any = await api?.query.system.account(params.walletAddress);
			const freeBalance = balance.data.free.toNumber();
			if (freeBalance < totalAmount) {
				throw new Error("Not enough balance");
			}

			// Create and submit transaction
			let resolveOut: any;
			let rejectOut: any;
			const promise = new Promise((resolve, reject) => {
				resolveOut = resolve;
				rejectOut = reject;
			});

			let blockHash = "";
			let txHash = "";
			const depositAddress = await this.fetchTAOVault();

			const tx = api.tx.balances.transferKeepAlive(depositAddress, totalAmount);
			const unsub = await tx.signAndSend(
				"address" in this.signer ? this.signer : params.walletAddress,
				{
					signer: "address" in this.signer ? undefined : this.signer,
				},
				({ events = [], isInBlock, isFinalized, isError, status, txHash: _txHash }) => {
					console.debug("Transaction status:", status.type);
					if (isInBlock || isFinalized) {
						console.debug("Included at block hash", status.asInBlock.toHex());
						blockHash = status.asInBlock.toHex();
						txHash = _txHash.toHex();
						const isSuccess = events.every(
							({ event }) => !api.events.system.ExtrinsicFailed.is(event),
						);
						if (isSuccess) {
							unsub();
							resolveOut();
						}
					} else if (isError) {
						unsub();
						rejectOut(new Error("Transaction failed"));
					}
				},
			);

			await promise;
			return { txHash, blockHash };
		} finally {
			// Ensure API is disconnected
			await api.disconnect().catch(() => {});
		}
	}
}
