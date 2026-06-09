import axios, { type AxiosInstance } from "axios";

import { CARD_API_URL } from "../constants";

export class ZebecCardAPIService {
	readonly apiUrl: string;
	private readonly api: AxiosInstance;

	constructor(sandbox?: boolean) {
		this.apiUrl = sandbox ? CARD_API_URL.Sandbox : CARD_API_URL.Production;

		this.api = axios.create({ baseURL: this.apiUrl });
	}

	// Ping API status
	async ping() {
		try {
			await this.api.get("/health");
			return true;
		} catch (_) {
			throw new Error("Card service is down. Please try again later.");
		}
	}

	/**
	 * @deprecated Use {@link fetchVaultByMintAddress} instead
	 *
	 * @param symbol Token symbol
	 * @returns An object containing address and tag (optional)
	 */
	async fetchVault(symbol: string) {
		const { data } = await this.api.get(`/tokens/deposit-address`, {
			params: { symbol },
		});
		return data.data as { address: string; tag?: string };
	}

	/**
	 * 
	 * @param address mint address
	 * @returns An object containing address and tag (optional)
	 */
	async fetchVaultByMintAddress(address: string) {
		const response = await this.api.get(`/tokens/deposit-address`, {
			params: {
				mintAddress: address,
			},
		});

		const data = response.data as unknown;

		if (
			!data ||
			typeof data !== "object" ||
			!("data" in data) ||
			!data.data ||
			typeof data.data !== "object" ||
			!("address" in data.data) ||
			typeof data.data.address !== "string"
		) {
			throw new Error(
				`Invalid response shape for fetching vault address by mint address. data:\n${String(data)}`,
			);
		}

		if ("tag" in data.data && data.data.tag && typeof data.data.tag !== "string") {
			throw new Error(
				`Invalid response shape for fetching vault address by mint address. data:\n${String(data)}`
			)
		}

		return data.data as { address: string; tag?: string };
	}
}
