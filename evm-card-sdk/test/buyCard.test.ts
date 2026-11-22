import assert from "assert";

import { sha256Hash } from "@zebec-network/core-utils";
import { ethers } from "ethers";
import { afterEach, describe, it } from "mocha";

import {
	type BlackCardSignatureData,
	type BuyCardParams,
	type CardV2SignatureData,
	DEFAULT_GAS_LIMIT,
	SupportedChain,
	type SwapData,
	type Token,
	Token__factory,
	type ZebecCard,
	ZebecCardService,
} from "../src";

const buyerEmail = "user@example.com";
const emailHash = sha256Hash(buyerEmail);
const response = { hash: "0xtransaction" } as ethers.ContractTransactionResponse;
const signatureData: CardV2SignatureData = {
	feeAmount: "1",
	validUntil: 2_000_000_000n,
	signature: "0x1234",
};
const blackSignatureData: BlackCardSignatureData = {
	...signatureData,
	dailyCardBuyLimit: "1000",
	minCardAmount: "1",
	maxCardAmount: "1000",
};
const swapData: Omit<SwapData, "gas" | "gasPrice"> = {
	dstAmount: "99",
	from: "0x0000000000000000000000000000000000000001",
	to: "0x0000000000000000000000000000000000000002",
	ether: "0",
	swapParams: {
		executor: "0x0000000000000000000000000000000000000003",
		description: {
			srcToken: "0x0000000000000000000000000000000000000004",
			dstToken: "0x0000000000000000000000000000000000000005",
			srcReceiver: "0x0000000000000000000000000000000000000006",
			dstReceiver: "0x0000000000000000000000000000000000000007",
			srcAmount: "100",
			minReturnAmount: "100",
			flags: "0",
		},
		routeData: "0x",
	},
};

const parsedDescription = {
	srcToken: swapData.swapParams.description.srcToken,
	dstToken: swapData.swapParams.description.dstToken,
	srcReceiver: swapData.swapParams.description.srcReceiver,
	dstReceiver: swapData.swapParams.description.dstReceiver,
	amount: ethers.parseUnits("100", 6),
	minReturnAmount: ethers.parseUnits("100", 6),
	flags: 0n,
};
const defaultOverrides = { gasLimit: DEFAULT_GAS_LIMIT };
const swapOverrides = { value: 0n, ...defaultOverrides };

type ContractCall = {
	name: string;
	args: unknown[];
};

function createService(chainId: SupportedChain = SupportedChain.Bsc) {
	const calls: ContractCall[] = [];
	const record = (name: string, args: unknown[]) => {
		calls.push({ name, args });
		return response;
	};
	const cardConfig = {
		minCardAmount: ethers.parseUnits("1", 6),
		maxCardAmount: ethers.parseUnits("1000", 6),
		dailyCardBuyLimit: ethers.parseUnits("5000", 6),
	};
	const zebecCard = {
		cardConfig: async () => cardConfig,
		cardPurchases: async () => ({ unixInRecord: 0n, totalCardBoughtPerDay: 0n }),
		getCustomTokenFee: async () => 100n,
		getMinimumUSDCAmount: async (...args: unknown[]) => {
			calls.push({ name: "getMinimumUSDCAmount", args });
			return ethers.parseUnits("99", 6);
		},
		buyCardDirect: async (...args: unknown[]) => record("buyCardDirect", args),
		buyCardDirectV2: async (...args: unknown[]) => record("buyCardDirectV2", args),
		buyBlackCardDirect: async (...args: unknown[]) => record("buyBlackCardDirect", args),
		swapAndBuy: async (...args: unknown[]) => record("swapAndBuy", args),
		swapAndBuyV2: async (...args: unknown[]) => record("swapAndBuyV2", args),
		swapAndBuyBlackCard: async (...args: unknown[]) => record("swapAndBuyBlackCard", args),
	} as unknown as ZebecCard;
	const usdcToken = { decimals: async () => 6n } as unknown as Token;
	const service = Object.create(ZebecCardService.prototype) as ZebecCardService;

	Object.assign(service, {
		chainId,
		signer: {},
		zebecCard,
		usdcToken,
		buyCardDirect: () => {
			throw new Error("buyCard must not delegate to buyCardDirect");
		},
		buyCardDirectV2: () => {
			throw new Error("buyCard must not delegate to buyCardDirectV2");
		},
		swapAndBuyCardDirect: () => {
			throw new Error("buyCard must not delegate to swapAndBuyCardDirect");
		},
		swapAndBuyCardDirectV2: () => {
			throw new Error("buyCard must not delegate to swapAndBuyCardDirectV2");
		},
		buyBlackCardDirect: () => {
			throw new Error("buyCard must not delegate to buyBlackCardDirect");
		},
		swapAndBuyBlackCard: () => {
			throw new Error("buyCard must not delegate to swapAndBuyBlackCard");
		},
		swapAndBuyCardOdyssey: () => {
			throw new Error("buyCard must not delegate to swapAndBuyCardOdyssey");
		},
	});

	return { service, calls };
}

const originalTokenConnect = Token__factory.connect;
afterEach(() => {
	Token__factory.connect = originalTokenConnect;
});

describe("ZebecCardService: buyCard", () => {
	const testCases: Array<{
		name: string;
		params: BuyCardParams;
		method: string;
		expectedArgs: unknown[];
	}> = [
		{
			name: "buys a silver card directly without a signature",
			params: { amount: "10", cardType: "silver", buyerEmail },
			method: "buyCardDirect",
			expectedArgs: [ethers.parseUnits("10", 6), "non_reloadable", emailHash, defaultOverrides],
		},
		{
			name: "buys a carbon card directly with v2 signature data",
			params: { amount: "10", cardType: "carbon", buyerEmail, signatureData },
			method: "buyCardDirectV2",
			expectedArgs: [
				ethers.parseUnits("10", 6),
				ethers.parseUnits("1", 6),
				signatureData.validUntil,
				"reloadable",
				emailHash,
				signatureData.signature,
				defaultOverrides,
			],
		},
		{
			name: "buys a black card directly",
			params: {
				amount: "10",
				cardType: "black",
				buyerEmail,
				signatureData: blackSignatureData,
			},
			method: "buyBlackCardDirect",
			expectedArgs: [
				ethers.parseUnits("10", 6),
				ethers.parseUnits("1", 6),
				ethers.parseUnits("1000", 6),
				ethers.parseUnits("1", 6),
				ethers.parseUnits("1000", 6),
				blackSignatureData.validUntil,
				"non_reloadable",
				emailHash,
				blackSignatureData.signature,
				defaultOverrides,
			],
		},
		{
			name: "swaps and buys a silver card without a signature",
			params: { swapData, cardType: "silver", buyerEmail },
			method: "swapAndBuy",
			expectedArgs: [
				swapData.swapParams.executor,
				parsedDescription,
				swapData.swapParams.routeData,
				"non_reloadable",
				emailHash,
				swapOverrides,
			],
		},
		{
			name: "swaps and buys a carbon card with v2 signature data",
			params: { swapData, cardType: "carbon", buyerEmail, signatureData },
			method: "swapAndBuyV2",
			expectedArgs: [
				swapData.swapParams.executor,
				parsedDescription,
				swapData.swapParams.routeData,
				ethers.parseUnits("1", 6),
				signatureData.validUntil,
				"reloadable",
				emailHash,
				signatureData.signature,
				swapOverrides,
			],
		},
		{
			name: "swaps and buys a black card",
			params: {
				swapData,
				cardType: "black",
				buyerEmail,
				signatureData: blackSignatureData,
			},
			method: "swapAndBuyBlackCard",
			expectedArgs: [
				swapData.swapParams.executor,
				parsedDescription,
				swapData.swapParams.routeData,
				ethers.parseUnits("1", 6),
				ethers.parseUnits("1000", 6),
				ethers.parseUnits("1", 6),
				ethers.parseUnits("1000", 6),
				blackSignatureData.validUntil,
				"non_reloadable",
				emailHash,
				blackSignatureData.signature,
				swapOverrides,
			],
		},
	];

	for (const testCase of testCases) {
		it(testCase.name, async () => {
			Token__factory.connect = () => ({ decimals: async () => 6n }) as unknown as Token;
			const { service, calls } = createService();

			assert.strictEqual(await service.buyCard(testCase.params), response);
			assert.deepStrictEqual(calls, [{ name: testCase.method, args: testCase.expectedArgs }]);
		});
	}

	it("swaps native ETH and buys a carbon card on Odyssey", async () => {
		const { service, calls } = createService(SupportedChain.OdysseyTestnet);
		const params: BuyCardParams = {
			ether: "0.1",
			slippage: 1,
			cardType: "carbon",
			buyerEmail,
		};

		assert.strictEqual(await service.buyCard(params), response);
		assert.deepStrictEqual(calls, [
			{
				name: "getMinimumUSDCAmount",
				args: [ethers.parseEther("0.1"), 1],
			},
			{
				name: "swapAndBuy",
				args: [
					"reloadable",
					buyerEmail,
					ethers.parseUnits("99", 6),
					{ value: ethers.parseEther("0.1"), ...defaultOverrides },
				],
			},
		]);
	});

	it("rejects native ETH swaps outside Odyssey", async () => {
		const { service, calls } = createService();

		await assert.rejects(
			service.buyCard({ ether: "0.1", slippage: 1, cardType: "silver", buyerEmail }),
			/Method not supported for this chain/,
		);
		assert.deepStrictEqual(calls, []);
	});

	it("rejects signature data for native ETH swaps", async () => {
		const { service, calls } = createService(SupportedChain.OdysseyTestnet);
		const params = {
			ether: "0.1",
			slippage: 1,
			cardType: "silver",
			buyerEmail,
			signatureData,
		} as unknown as BuyCardParams;

		await assert.rejects(
			service.buyCard(params),
			/Odyssey swaps only support unsigned silver or carbon card purchases/,
		);
		assert.deepStrictEqual(calls, []);
	});

	it("rejects native ETH swaps without slippage", async () => {
		const { service } = createService(SupportedChain.OdysseyTestnet);
		const params = { ether: "0.1", cardType: "silver", buyerEmail } as BuyCardParams;

		await assert.rejects(service.buyCard(params), /Odyssey swaps require ether and slippage/);
	});

	it("supports unsigned direct purchases on Odyssey", async () => {
		const { service, calls } = createService(SupportedChain.OdysseyTestnet);

		await service.buyCard({ amount: "10", cardType: "silver", buyerEmail });

		assert.strictEqual(calls[0]?.name, "buyCardDirect");
	});

	it("rejects v2 purchases on Odyssey", async () => {
		const { service, calls } = createService(SupportedChain.OdysseyTestnet);

		await assert.rejects(
			service.buyCard({ amount: "10", cardType: "silver", buyerEmail, signatureData }),
			/Method not supported for this chain/,
		);
		assert.deepStrictEqual(calls, []);
	});

	it("rejects swap purchases on Odyssey", async () => {
		const { service, calls } = createService(SupportedChain.OdysseyTestnet);

		await assert.rejects(
			service.buyCard({ swapData, cardType: "silver", buyerEmail }),
			/Method not supported for this chain/,
		);
		assert.deepStrictEqual(calls, []);
	});

	it("rejects both amount and swapData", async () => {
		const { service } = createService();
		const params = {
			amount: "10",
			swapData,
			cardType: "silver",
			buyerEmail,
		} as unknown as BuyCardParams;

		await assert.rejects(
			service.buyCard(params),
			/Provide exactly one of amount, swapData, or ether/,
		);
	});

	it("rejects missing payment data", async () => {
		const { service } = createService();
		const params = { cardType: "silver", buyerEmail } as BuyCardParams;

		await assert.rejects(
			service.buyCard(params),
			/Provide exactly one of amount, swapData, or ether/,
		);
	});

	it("rejects black card purchases without signature data", async () => {
		const { service } = createService();
		const params = { amount: "10", cardType: "black", buyerEmail } as BuyCardParams;

		await assert.rejects(service.buyCard(params), /Black card purchases require signatureData/);
	});
});
