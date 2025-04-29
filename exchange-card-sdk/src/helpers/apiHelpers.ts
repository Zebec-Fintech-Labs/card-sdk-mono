import axios, { AxiosInstance } from "axios";
import crypto from "crypto";

import { CARD_API_URL } from "../constants";
import { Quote } from "../types";

export type APIConfig = { apiKey: string; encryptionKey: string };

export class ZebecCardAPIService {
	readonly apiConfig: APIConfig & { apiUrl: string };
	private readonly sdkVersion: string = "1.0.0";
	private readonly api: AxiosInstance;

	constructor(apiConfig: APIConfig, sandbox?: boolean) {
		this.apiConfig = {
			...apiConfig,
			apiUrl: sandbox ? CARD_API_URL.Sandbox : CARD_API_URL.Production,
		};

		this.api = axios.create({ baseURL: this.apiConfig.apiUrl });
	}

	// Generate request signature
	private generateSignature(method: string, path: string, timestamp: number, body?: any): string {
		const stringToSign = [
			method.toUpperCase(),
			path,
			timestamp,
			this.apiConfig.apiKey,
			body ? JSON.stringify(body) : "",
		].join("");

		return crypto
			.createHmac("sha256", this.apiConfig.encryptionKey)
			.update(stringToSign)
			.digest("hex");
	}

	// Generate request headers
	generateRequestHeaders(method: string, path: string, body?: any) {
		const timestamp = Math.floor(Date.now() / 1000);
		const nonce = crypto.randomBytes(16).toString("hex");

		return {
			"X-API-Key": this.apiConfig.apiKey,
			"X-Timestamp": timestamp.toString(),
			"X-Nonce": nonce,
			"X-Signature": this.generateSignature(method, path, timestamp, body),
			"X-SDK-Version": this.sdkVersion,
			"Content-Type": "application/json",
		};
	}

	// Encrypt sensitive data fields
	encryptSensitiveData(data: any) {
		const iv = crypto.randomBytes(16);
		const key = crypto.pbkdf2Sync(this.apiConfig.encryptionKey, iv, 1000, 32, "sha256");
		const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

		let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64");
		encrypted += cipher.final("base64");
		const authTag = cipher.getAuthTag();

		return `${iv.toString("base64")}:${encrypted}:${authTag.toString("base64")}`;
	}

	// Ping API status
	async ping() {
		try {
			await this.api.get("/ping");
			return true;
		} catch (error) {
			throw new Error("Card service is down. Please try again later.");
		}
	}

	// Purchase Card
	async purchaseCard(data: any) {
		console.debug("Payload data:", data);
		const encryptedData = this.encryptSensitiveData(data);
		console.debug("Encrypted Data: %s \n", encryptedData);
		const method = "POST";
		const path = "/orders/create";
		const url = this.apiConfig.apiUrl + path;
		const payload = { data: encryptedData };
		const headers = this.generateRequestHeaders(method, path, payload);

		const response = await axios.post(url, payload, { headers });

		return response;
	}

	// Fetch quote
	async fetchQuote(symbol: string) {
		const response = await this.api.get("/exchange/price", { params: { symbol } });

		const data = response.data;
		return data.data as Quote;
	}

	async fetchVault(symbol: string) {
		const { data } = await this.api.get(`/exchange/deposit-address`, { params: { symbol } });
		return data.data as { address: string; tag?: string };
	}
}
