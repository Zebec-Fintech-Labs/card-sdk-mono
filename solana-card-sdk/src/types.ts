import { BN, web3 } from "@coral-xyz/anchor";

import {
	InvalidBigIntStringError,
	InvalidDecimalStringError,
	InvalidEmailStringError,
	InvalidPercentStringError,
	InvalidPublicKeyStringError,
} from "./errors";

declare const __label: unique symbol;

export type Labeled<T, Label> = T & { [__label]: Label };

export type DecimalString = Labeled<string, "Decimal">;

export type PercentString = Labeled<string, "Percent">;

export type PublicKeyString = Labeled<string, "PubkeyString">;

export type EmailString = Labeled<string, "Email">;

export type BigIntString = Labeled<string, "BigInt">;

export function assertValidBigIntString(input: string | number): asserts input is BigIntString {
	try {
		BigInt(input);
	} catch {
		throw new InvalidBigIntStringError(input);
	}
}

export function parseBigIntString(input: string | number): BigIntString {
	assertValidBigIntString(input);
	return input;
}

export function assertValidDecimalString(input: string): asserts input is DecimalString {
	if (!/^\d+(\.\d+)?$/.test(input)) {
		throw new InvalidDecimalStringError(input);
	}
}

export function parseDecimalString(input: string | number): DecimalString {
	const value = input.toString();
	assertValidDecimalString(value);
	return value;
}

export function assertValidPercentString(input: string): asserts input is PercentString {
	if (!/^(100(\.0{1,2})?|(0|[1-9]\d?)(\.\d+)?)$/.test(input)) {
		throw new InvalidPercentStringError(input);
	}
}

export function parsePercentString(input: string | number): PercentString {
	const value = input.toString();
	assertValidPercentString(value);
	return value;
}

export function assertValidPublicKeyString(input: string): asserts input is PublicKeyString {
	try {
		new web3.PublicKey(input);
	} catch {
		throw new InvalidPublicKeyStringError(input);
	}
}

export function parsePublicKeyString(input: string | web3.PublicKey): PublicKeyString {
	const value = input.toString();
	assertValidPublicKeyString(value);
	return value;
}

export function assertEmailString(value: string): asserts value is EmailString {
	if (!/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/.test(value)) {
		throw new InvalidEmailStringError(value);
	}
}

export function parseEmailString(input: string) {
	assertEmailString(input);
	return input;
}

export type CardType = "silver" | "carbon";

export type InstructionCardType = "reloadable" | "non_reloadable";

export type ParsedFeeTier = {
	minAmount: BN;
	maxAmount: BN;
	fee: BN;
};

export type ParsedTokenFeeStruct = {
	tokenAddress: web3.PublicKey;
	fee: BN;
};

export type ParsedTokenFeeList = ParsedTokenFeeStruct[];

export type ParsedCardConfigInfo = {
	index: BN;
	zicOwner: web3.PublicKey;
	nativeFee: BN;
	nonNativeFee: BN;
	revenueFee: BN;
	usdcMint: web3.PublicKey;
	revenueVault: web3.PublicKey;
	commissionVault: web3.PublicKey;
	cardVault: web3.PublicKey;
	totalBought: BN;
	dailyCardBuyLimit: BN;
	providerConfig: ParsedProviderConfig;
};

export type ParsedProviderConfig = {
	minCardAmount: BN;
	maxCardAmount: BN;
	feeTiers: {
		tiers: ParsedFeeTier[];
	};
};
