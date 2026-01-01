import axios, { AxiosInstance } from "axios";

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
		} catch (error) {
			throw new Error("Card service is down. Please try again later.");
		}
	}

	async fetchVault(symbol: string) {
		const { data } = await this.api.get(`/tokens/deposit-address`, { params: { symbol } });
		return data.data as { address: string; tag?: string };
	}
}
