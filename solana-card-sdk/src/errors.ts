export class NotEnoughBalanceError extends Error {
	name: string = "NotEnoughBalanceError";

	constructor(message: string) {
		super(message);
	}
}

export class QuoteResponseError extends Error {
	name: string = "QuoteResponseError";

	constructor(message: string) {
		super(message);
	}
}

export class AssociatedTokenAccountDoesNotExistsError extends Error {
	name: string = "AssociatedTokenAccountDoesNotExistsError";

	constructor(message: string) {
		super(message);
	}
}

export class UserVaultNotInitializeError extends Error {
	name: string = "UserVaultNotInitializeError";

	readonly vaultAddress: string;
	constructor({ userVaultAddress }: Readonly<{ userVaultAddress: string }>) {
		super("User vault " + userVaultAddress + " is not initialized or does not exist");
		this.vaultAddress = userVaultAddress;
	}
}

export class InvalidUsdcAddressError extends Error {
	name: string = "InvalidUsdcAddressError";

	constructor(readonly mintAddress: string) {
		super("Invalid USDC address: " + mintAddress);
	}
}

export class InvalidDecimalStringError extends Error {
	name: string = "InvalidDecimalStringError";

	constructor(readonly value: string) {
		super("Invalid decimal string: " + value);
	}
}

export class InvalidPercentStringError extends Error {
	name: string = "InvalidPercentStringError";

	constructor(readonly value: string) {
		super("Invalid percent string: " + value);
	}
}

export class InvalidPublicKeyStringError extends Error {
	name: string = "InvalidPublicKeyStringError";
	constructor(readonly value: string) {
		super("Invalid public key string: " + value);
	}
}

export class InvalidEmailStringError extends Error {
	name: string = "InvalidEmailStringError";

	constructor(readonly value: string) {
		super("Invalid email string: " + value);
	}
}

export class InvalidBigIntStringError extends Error {
	name: string = "InvalidBigIntStringError";

	constructor(readonly value: string | number) {
		super("Invalid bigint string: " + value.toString());
	}
}

export class AmountOutOfRangeError extends Error {
	name: string = "AmountOutOfRangeError";

	constructor(
		readonly minRange: string,
		readonly maxRange: string,
		readonly value: string,
	) {
		super("Amount out of range: " + value + "; Must be within " + minRange + "-" + maxRange);
	}
}

export class DailyCardLimitReachedError extends Error {
	name: string = "DailyCardLimitReachedError";

	constructor(
		readonly dailyCardLimit: string,
		readonly requestedAmount: string,
	) {
		super("Daily card limit reached. Limit: " + dailyCardLimit + " Requested: " + requestedAmount);
	}
}
