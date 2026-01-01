import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";

import { BITCOIN_ENDPOINTS } from "../constants";
import { ZebecCardAPIService } from "../helpers/apiHelpers";

type UTXO = {
	txid: string;
	vout: number;
	value: number;
	status: {
		confirmed: boolean;
		block_height: number;
		block_hash: string;
		block_time: number;
	};
};

// type Transaction = {
// 	txid: string;
// 	version: number;
// 	locktime: number;
// 	vin: {
// 		txid: string;
// 		vout: number;
// 		prevout: {
// 			scriptpubkey: string;
// 			scriptpubkey_asm: string;
// 			scriptpubkey_type: string;
// 			scriptpubkey_address: string;
// 			value: number;
// 		};
// 		scriptsig: string;
// 		scriptsig_asm: string;
// 		witness: string[];
// 		is_coinbase: boolean;
// 		sequence: number;
// 	}[];
// 	vout: {
// 		scriptpubkey: string;
// 		scriptpubkey_asm: string;
// 		scriptpubkey_type: string;
// 		scriptpubkey_address: string;
// 		value: number;
// 	}[];
// 	size: number;
// 	weight: number;
// 	sigops: number;
// 	fee: number;
// 	status: {
// 		confirmed: boolean;
// 		block_height: number;
// 		block_hash: string;
// 		block_time: number;
// 	};
// };

interface BitcoinWallet {
	address: string;
	signTransaction: (psbt: bitcoin.Psbt) => Promise<bitcoin.Psbt>;
	broadcastTransaction: (tx: string) => Promise<string>;
}

export class BitcoinService {
	private apiService: ZebecCardAPIService;
	private network: bitcoin.Network;
	private apiEndpoint: string;

	constructor(
		readonly wallet: BitcoinWallet,
		sdkOptions?: {
			sandbox?: boolean;
			apiKey?: string;
		},
	) {
		const sandbox = sdkOptions?.sandbox ?? false;
		this.apiService = new ZebecCardAPIService(sandbox);
		this.network = sandbox ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
		this.apiEndpoint = sandbox ? BITCOIN_ENDPOINTS.Sandbox : BITCOIN_ENDPOINTS.Production;
	}

	/**
	 * Fetches the Bitcoin vault address.
	 *
	 * @returns {Promise<{ address: string }>} A promise that resolves to the vault address.
	 */
	async fetchVault() {
		const data = await this.apiService.fetchVault("BTC");
		return data;
	}

	async getUTXOs(): Promise<
		Array<{
			txid: string;
			vout: number;
			value: number;
			rawTx: Buffer;
		}>
	> {
		const response = await axios.get<UTXO[]>(
			`${this.apiEndpoint}/address/${this.wallet.address}/utxo`,
		);

		console.log("utxos:", response.data);

		return Promise.all(
			response.data.map(async (utxo) => {
				const rawTx = await axios.get<string>(`${this.apiEndpoint}/tx/${utxo.txid}/hex`);

				console.log("txHex:", rawTx.data);
				if (!rawTx.data) {
					throw new Error("Transaction not found");
				}

				// const scriptPubKey = txResponse.data.vout[utxo.vout].scriptpubkey;

				return {
					txid: utxo.txid,
					vout: utxo.vout,
					value: utxo.value,
					rawTx: Buffer.from(rawTx.data, "hex"),
				};
			}),
		);
	}

	private async getBalance(): Promise<number> {
		const response = await axios.get<UTXO[]>(
			`${this.apiEndpoint}/address/${this.wallet.address}/utxo`,
		);
		const utxos = response.data;
		return utxos.reduce((sum, utxo) => sum + utxo.value, 0);
	}

	/**
	 * Transfers Bitcoin to the vault address.
	 *
	 * @param {string} amount - The amount of BTC to transfer in BTC units
	 * @param {number} feeRate - Fee rate in satoshis per byte
	 * @returns {Promise<string>} - A promise that resolves to the transaction hash
	 * @throws {Error} If there is not enough balance or if the transaction fails.
	 */
	async transferBTC(amount: string, feeRate: number = 10): Promise<string> {
		// Convert BTC to satoshis
		const satoshisToSend = Math.floor(Number(amount) * 100_000_000);

		// Fetch deposit address
		const vault = await this.fetchVault();

		console.log({ vault });

		let retries = 0;
		const maxRetries = 5;
		let delay = 1000;

		const psbt = new bitcoin.Psbt({ network: this.network });

		const utxos = await this.getUTXOs();

		let inputAmount = 0;

		for (const utxo of utxos) {
			const transaction = bitcoin.Transaction.fromBuffer(utxo.rawTx);
			const script = transaction.outs[utxo.vout].script;
			const value = transaction.outs[utxo.vout].value;
			inputAmount += value;

			psbt.addInput({
				hash: utxo.txid,
				index: utxo.vout,
				// nonWitnessUtxo: utxo.rawTx,
				witnessUtxo: {
					script: script,
					value: value,
				},
			});

			if (inputAmount >= satoshisToSend) break;
		}

		if (inputAmount < satoshisToSend) {
			throw new Error("Insufficient UTXO amount");
		}

		// Add output for payment
		psbt.addOutput({
			// address: vault.address,
			address: "tb1q6h8w53xzj74n28kg8qq3d78xxgrch8zd2km97d",
			value: satoshisToSend,
		});

		// Add change output if necessary
		const estimatedFee = Math.ceil(psbt.toBuffer().length * feeRate);

		// Check wallet balance
		const balance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);

		if (balance < satoshisToSend + estimatedFee) {
			throw new Error("Insufficient balance");
		}

		const changeAmount = inputAmount - satoshisToSend - estimatedFee;
		if (changeAmount > 0) {
			psbt.addOutput({
				address: this.wallet.address,
				value: changeAmount,
			});
		}

		console.log("psbt:", JSON.stringify(psbt));
		// Sign transaction
		const signedPsbt = await this.wallet.signTransaction(psbt);
		const tx = signedPsbt.finalizeAllInputs().extractTransaction();

		while (retries < maxRetries) {
			try {
				// Broadcast transaction
				return this.wallet.broadcastTransaction(tx.toHex());
			} catch (error) {
				console.debug("error: ", error);

				if (retries >= maxRetries) {
					throw error;
				}

				retries += 1;
				console.debug(`Retrying in ${delay / 1000} seconds...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay *= 2; // Exponential backoff
			}
		}

		throw new Error("Max retries reached");
	}

	/**
	 * Gets the balance of the Bitcoin wallet.
	 *
	 * @returns {Promise<string>} - A promise that resolves to the wallet balance in BTC
	 */
	async getWalletBalance(): Promise<string> {
		try {
			const balanceSats = await this.getBalance();
			return (balanceSats / 100_000_000).toString();
		} catch (error) {
			console.debug("Error fetching BTC balance:", error);
			return "0";
		}
	}
}
