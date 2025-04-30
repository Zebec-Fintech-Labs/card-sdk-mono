import assert from "assert";

import { web3 } from "@coral-xyz/anchor";
import { MEMO_PROGRAM_ID } from "@zebec-network/solana-common";

import { ParsedFeeTier } from "./instructions";
import { FeeTier, QuoteInfo, RouteInfo } from "./service";
import {
	parseBigIntString,
	parseDecimalString,
	parsePercentString,
	parsePublicKeyString,
} from "./types";

/**
 * Parse jupiter quote response
 * @param connection
 * @param quoteInfo
 * @returns
 */
export async function parseQuoteInfo(quoteInfo: unknown): Promise<QuoteInfo> {
	assert(typeof quoteInfo === "object" && quoteInfo);

	if ("error" in quoteInfo) {
		assert(typeof quoteInfo.error === "string");
		return {
			error: quoteInfo.error,
		};
	}

	assert("routePlan" in quoteInfo && Array.isArray(quoteInfo.routePlan));
	assert("outputMint" in quoteInfo && typeof quoteInfo.outputMint === "string");
	assert("outAmount" in quoteInfo && typeof quoteInfo.outAmount === "string");
	assert("inputMint" in quoteInfo && typeof quoteInfo.inputMint === "string");
	assert("inAmount" in quoteInfo && typeof quoteInfo.inAmount === "string");
	assert(
		"swapMode" in quoteInfo &&
			(quoteInfo.swapMode === "ExactIn" || quoteInfo.swapMode === "ExactOut"),
	);
	assert("otherAmountThreshold" in quoteInfo && typeof quoteInfo.otherAmountThreshold === "string");
	assert("contextSlot" in quoteInfo && typeof quoteInfo.contextSlot === "number");
	assert("timeTaken" in quoteInfo && typeof quoteInfo.timeTaken === "number");

	const routePlan = await Promise.all(
		quoteInfo.routePlan.map<Promise<RouteInfo>>(async (r: unknown) => {
			assert(typeof r === "object" && r);
			assert("percent" in r && typeof r.percent === "number");

			assert("swapInfo" in r && typeof r.swapInfo === "object" && r.swapInfo);
			assert("inputMint" in r.swapInfo && typeof r.swapInfo.inputMint === "string");
			assert("inAmount" in r.swapInfo && typeof r.swapInfo.inAmount === "string");
			assert("outputMint" in r.swapInfo && typeof r.swapInfo.outputMint === "string");
			assert("outAmount" in r.swapInfo && typeof r.swapInfo.outAmount === "string");
			assert("ammKey" in r.swapInfo && typeof r.swapInfo.ammKey === "string");
			assert("feeAmount" in r.swapInfo && typeof r.swapInfo.feeAmount === "string");
			assert("feeMint" in r.swapInfo && typeof r.swapInfo.feeMint === "string");
			assert("label" in r.swapInfo && typeof r.swapInfo.label === "string");

			return {
				percent: r.percent,
				swapInfo: {
					ammKey: parsePublicKeyString(r.swapInfo.ammKey),
					feeAmount: parseBigIntString(r.swapInfo.feeAmount),
					feeMint: parsePublicKeyString(r.swapInfo.feeMint),
					inAmount: parseBigIntString(r.swapInfo.inAmount),
					inputMint: parsePublicKeyString(r.swapInfo.inputMint),
					label: r.swapInfo.label,
					outAmount: parseBigIntString(r.swapInfo.outAmount),
					outputMint: parsePublicKeyString(r.swapInfo.outputMint),
				},
			};
		}),
	);

	assert("slippageBps" in quoteInfo && typeof quoteInfo.slippageBps === "number");
	assert(
		"platformFee" in quoteInfo &&
			(typeof quoteInfo.platformFee === "string" || quoteInfo.platformFee === null),
	);
	assert("priceImpactPct" in quoteInfo && typeof quoteInfo.priceImpactPct === "string");

	return {
		inputMint: parsePublicKeyString(quoteInfo.inputMint),
		inAmount: parseBigIntString(quoteInfo.inAmount),
		outputMint: parsePublicKeyString(quoteInfo.outputMint),
		outAmount: parseBigIntString(quoteInfo.outAmount),
		otherAmountThreshold: parseBigIntString(quoteInfo.otherAmountThreshold),
		swapMode: quoteInfo.swapMode,
		slippageBps: quoteInfo.slippageBps,
		platformFee: quoteInfo.platformFee,
		priceImpactPct: parsePercentString(quoteInfo.priceImpactPct),
		routePlan,
		contextSlot: quoteInfo.contextSlot,
		timeTaken: quoteInfo.timeTaken,
	};
}

export function sortFeeTierDesc(feeTiers: ParsedFeeTier[]) {
	return feeTiers.sort((a, b) => b.minAmount.cmp(a.minAmount));
}

export function parseFeeTiers(
	input: { minAmount: string; maxAmount: string; feePercent: string }[],
) {
	return input.map<FeeTier>((ft) => {
		return {
			feePercent: parsePercentString(ft.feePercent),
			maxAmount: parseDecimalString(ft.maxAmount),
			minAmount: parseDecimalString(ft.minAmount),
		};
	});
}

export function getBuyCardMemoFromParsedTransaction(transaction: web3.ParsedTransaction) {
	const memoInstruction = transaction.message.instructions.find((ix) =>
		ix.programId.equals(MEMO_PROGRAM_ID),
	);
	assert(memoInstruction, "Transaction does not contain memo instruction");
	// throw error if instruction does not have parsed property
	assert("parsed" in memoInstruction, "Memo instruction does not contain `parsed` property");

	const memo: unknown = JSON.parse(memoInstruction.parsed);

	// throw error if memo does not have buyer property
	assert(
		typeof memo === "object" && memo && "buyer" in memo && typeof memo.buyer === "string",
		"Memo is invalid",
	);

	return memo;
}
