import { SupportedChain } from "./chains";
import { ValidationError } from "./errors";
import { formatAmount, hasLen, isAlphaNumeric, isEmailValid } from "./utils";

export class OrderCardRequest {
	readonly amount: Money;
	readonly recipient: Recipient;
	readonly receipt: Receipt;

	constructor(amount: Money, recipient: Recipient, receipt: Receipt) {
		this.amount = amount;
		this.receipt = receipt;
		this.recipient = recipient;
	}
}

// export class Quote {
// 	id: string; // Unique identifier for the quote
// 	token: string; // Token symbol or name (e.g., BTC, ETH)
// 	targetCurrency: string; // Target currency (e.g., "USD")
// 	amountRequested: number; // Amount of USD the user wants to purchase
// 	pricePerUnitCurrency: number; // Price of 1 USD in terms of the token
// 	totalPrice: number; // Total token amount needed for the USD purchase
// 	platformFee: number; // Any additional platform fee
// 	expiresIn: number; // Validity period for the quote in seconds or ISO date
// 	timestamp: Date; // Timestamp when the quote was generated
// 	status: "pending" | "expired" | "accepted" | "rejected"; // Quote status

// 	constructor(
// 		id: string,
// 		token: string,
// 		targetCurrency: string,
// 		amountRequested: number,
// 		pricePerUnitCurrency: number,
// 		totalPrice: number,
// 		platformFee: number,
// 		expiresIn: number,
// 		timestamp: Date,
// 		status: "pending" | "expired" | "accepted" | "rejected",
// 	) {
// 		this.id = id;
// 		this.token = token;
// 		this.targetCurrency = targetCurrency;
// 		this.amountRequested = amountRequested;
// 		this.pricePerUnitCurrency = pricePerUnitCurrency;
// 		this.totalPrice = totalPrice;
// 		this.platformFee = platformFee;
// 		this.expiresIn = expiresIn;
// 		this.timestamp = timestamp;
// 		this.status = status;
// 	}
// }

export class Quote {
	price: number; // Total token amount needed for the USD purchase
	fluctuationPercentage: number; // Amount of USD the user wants to purchase
	token: string; // Timestamp when the quote was generated

	constructor(
		price: number, // Total token amount needed for the USD purchase
		fluctuationPercentage: number, // Amount of USD the user wants to purchase
		token: string,
	) {
		this.price = price;
		this.fluctuationPercentage = fluctuationPercentage;
		this.token = token;
	}
}

export class Deposit {
	tokenName: string;
	tokenAmount: number;
	signature: string;
	buyerAddress: string;
	txHash?: string;
	blockHash?: string;
	chainId?: SupportedChain;
	purchaseCounter?: number;

	constructor(
		tokenName: string,
		tokenAmount: number,
		signature: string,
		buyerAddress: string,
		txHash?: string,
		blockHash?: string,
		chainId?: SupportedChain,
		purchaseCounter?: number,
	) {
		this.tokenName = tokenName;
		this.tokenAmount = tokenAmount;
		this.signature = signature;
		this.txHash = txHash;
		this.blockHash = blockHash;
		this.chainId = chainId;
		this.buyerAddress = buyerAddress;
		this.purchaseCounter = purchaseCounter;
	}
}

export class Receipt {
	quote?: Quote;
	deposit?: Deposit;

	constructor(quote?: Quote, deposit?: Deposit) {
		this.quote = quote;
		this.deposit = deposit;
	}
}

export class Money {
	readonly amount: number;
	readonly currencyCode: string;

	private constructor(amount: number, currencyCode: string) {
		this.amount = amount;
		this.currencyCode = currencyCode;
	}

	// Example static method to create a Money instance from an amount and optional currency code
	static create(amount: number | string, currencyCode: string): Money {
		return new Money(Number(amount), currencyCode);
	}

	static USD(amount: number | string): Money {
		return this.create(formatAmount(amount), "USD");
	}
}

export class Recipient {
	readonly participantId: string;
	readonly firstName: string;
	readonly lastName: string;
	readonly emailAddress: string;
	readonly address1: string;
	readonly address2?: string;
	readonly city: string;
	readonly state: string;
	readonly postalCode: string;
	readonly countryCode: CountryCode;
	readonly language: string = "en-US";
	readonly mobilePhone: string;

	private constructor(
		participantId: string,
		firstName: string,
		lastName: string,
		emailAddress: string,
		mobilePhone: string,
		language: string,
		city: string,
		state: string,
		postalCode: string,
		countryCode: CountryCode,
		address1: string,
		address2: string,
	) {
		this.participantId = participantId;
		this.firstName = firstName;
		this.lastName = lastName;
		this.address1 = address1;
		this.address2 = address2;
		this.city = city;
		this.state = state;
		this.postalCode = postalCode;
		this.countryCode = countryCode;
		this.emailAddress = emailAddress;
		this.language = language;
		this.mobilePhone = mobilePhone;
	}

	static create(
		participantId: string,
		firstName: string,
		lastName: string,
		emailAddress: string,
		mobilePhone: string,
		language: string,
		city: string,
		state: string,
		postalCode: string,
		countryCode: CountryCode,
		address1: string,
		address2?: string,
	) {
		if (!hasLen(participantId, 1, 20)) {
			throw new ValidationError("Participants must be of 1 to 20 characters.");
		}

		if (!isAlphaNumeric(participantId)) {
			throw new ValidationError("Participants must only contains alpha numeric characters");
		}

		if (!hasLen(firstName, 1, 50)) {
			throw new ValidationError("Firstname must be within 1 to 50 characters.");
		}

		if (!hasLen(lastName, 1, 50)) {
			throw new ValidationError("Lastname must be within 1 to 50 characters.");
		}

		if (!hasLen(emailAddress, 1, 80)) {
			throw new ValidationError("Email must be within 1 to 80 characters.");
		}

		if (!isEmailValid(emailAddress)) {
			throw new ValidationError("Email address must be a valid email.");
		}

		if (!hasLen(language, 2, 5)) {
			throw new ValidationError("Language code must be within 2 to 5 characters.");
		}

		if (!hasLen(mobilePhone, 1, 20)) {
			throw new ValidationError("Mobile phone number must be within 1 to 20 characters.");
		}

		if (!hasLen(city, 1, 50)) {
			throw new ValidationError("City must be within 1 to 50 characters.");
		}

		if (!hasLen(state, 1, 50)) {
			throw new ValidationError("State must be within 1 to 50 characters.");
		}

		if (!allCountriesWithCode.find((country) => country.code === countryCode)) {
			throw new ValidationError("CountryCode must be a valid supported ISO 3166-1 alpha-3 code");
		}

		if (!hasLen(postalCode, 1, 20)) {
			throw new ValidationError("Postal code must be within 1 to 20 characters.");
		}

		if (!hasLen(address1, 1, 50)) {
			throw new ValidationError("Address line 1 must be within 1 to 50 characters.");
		}

		if (address2 && !hasLen(address2, 1, 50)) {
			throw new ValidationError("Address line 2 must be within 1 to 50 characters.");
		}

		return new Recipient(
			participantId,
			firstName,
			lastName,
			emailAddress,
			mobilePhone,
			language,
			city,
			state,
			postalCode,
			countryCode,
			address1,
			address2 ?? "N/A",
		);
	}
}

export const allCountriesWithCode = [
	{ name: "Algeria", code: "DZA" },
	{ name: "Angola", code: "AGO" },
	{ name: "Argentina", code: "ARG" },
	{ name: "Australia", code: "AUS" },
	{ name: "Austria", code: "AUT" },
	{ name: "Belgium", code: "BEL" },
	{ name: "Bolivia (Plurinational State of)", code: "BOL" },
	{ name: "Brazil", code: "BRA" },
	{ name: "Cameroon", code: "CMR" },
	{ name: "Canada", code: "CAN" },
	{ name: "Chile", code: "CHL" },
	{ name: "Costa Rica", code: "CRI" },
	{ name: "Cyprus", code: "CYP" },
	{ name: "Czechia", code: "CZE" },
	{ name: "Denmark", code: "DNK" },
	{ name: "Ecuador", code: "ECU" },
	{ name: "Egypt", code: "EGY" },
	{ name: "El Salvador", code: "SLV" },
	{ name: "Estonia", code: "EST" },
	{ name: "Finland", code: "FIN" },
	{ name: "France", code: "FRA" },
	{ name: "Georgia", code: "GEO" },
	{ name: "Germany", code: "DEU" },
	{ name: "Ghana", code: "GHA" },
	{ name: "Greece", code: "GRC" },
	{ name: "Guatemala", code: "GTM" },
	{ name: "Honduras", code: "HND" },
	{ name: "Hungary", code: "HUN" },
	{ name: "Iceland", code: "ISL" },
	{ name: "Ireland", code: "IRL" },
	{ name: "Italy", code: "ITA" },
	{ name: "Jamaica", code: "JAM" },
	{ name: "Japan", code: "JPN" },
	{ name: "Jordan", code: "JOR" },
	{ name: "Kenya", code: "KEN" },
	{ name: "Korea, Republic of Korea", code: "KOR" },
	{ name: "Kuwait", code: "KWT" },
	{ name: "Lithuania", code: "LTU" },
	{ name: "Luxembourg", code: "LUX" },
	{ name: "Malawi", code: "MWI" },
	{ name: "Malaysia", code: "MYS" },
	{ name: "Malta", code: "MLT" },
	{ name: "Mexico", code: "MEX" },
	{ name: "Morocco", code: "MAR" },
	{ name: "Mozambique", code: "MOZ" },
	{ name: "Nepal", code: "NPL" },
	{ name: "Netherlands", code: "NLD" },
	{ name: "New Zealand", code: "NZL" },
	{ name: "Nigeria", code: "NGA" },
	{ name: "Norway", code: "NOR" },
	{ name: "Oman", code: "OMN" },
	{ name: "Pakistan", code: "PAK" },
	{ name: "Papua New Guinea", code: "PNG" },
	{ name: "Paraguay", code: "PRY" },
	{ name: "Peru", code: "PER" },
	{ name: "Philippines", code: "PHL" },
	{ name: "Poland", code: "POL" },
	{ name: "Portugal", code: "PRT" },
	{ name: "Puerto Rico", code: "PRI" },
	{ name: "Qatar", code: "QAT" },
	{ name: "Romania", code: "ROU" },
	{ name: "Saudi Arabia", code: "SAU" },
	{ name: "Singapore", code: "SGP" },
	{ name: "Slovakia", code: "SVK" },
	{ name: "Slovenia", code: "SVN" },
	{ name: "Spain", code: "ESP" },
	{ name: "Sweden", code: "SWE" },
	{ name: "Taiwan", code: "TWN" },
	{ name: "Thailand", code: "THA" },
	{ name: "Trinidad and Tobago", code: "TTO" },
	{ name: "Tunisia", code: "TUN" },
	{ name: "Turkey", code: "TUR" },
	{ name: "United Kingdom", code: "GBR" },
	{ name: "United States", code: "USA" },
	{ name: "Uruguay", code: "URY" },
	{ name: "Vanuatu", code: "VUT" },
	{ name: "Zambia", code: "ZMB" },
];

export type CountryCode =
	| "DZA"
	| "AGO"
	| "ARG"
	| "AUS"
	| "AUT"
	| "BEL"
	| "BOL"
	| "BRA"
	| "CMR"
	| "CAN"
	| "CHL"
	| "CRI"
	| "CYP"
	| "CZE"
	| "DNK"
	| "ECU"
	| "EGY"
	| "SLV"
	| "EST"
	| "FIN"
	| "FRA"
	| "GEO"
	| "DEU"
	| "GHA"
	| "GRC"
	| "GTM"
	| "HND"
	| "HUN"
	| "ISL"
	| "IRL"
	| "ITA"
	| "JAM"
	| "JPN"
	| "JOR"
	| "KEN"
	| "KOR"
	| "KWT"
	| "LTU"
	| "LUX"
	| "MWI"
	| "MYS"
	| "MLT"
	| "MEX"
	| "MAR"
	| "MOZ"
	| "NPL"
	| "NLD"
	| "NZL"
	| "NGA"
	| "NOR"
	| "OMN"
	| "PAK"
	| "PNG"
	| "PRY"
	| "PER"
	| "PHL"
	| "POL"
	| "PRT"
	| "PRI"
	| "QAT"
	| "ROU"
	| "SAU"
	| "SGP"
	| "SVK"
	| "SVN"
	| "ESP"
	| "SWE"
	| "TWN"
	| "THA"
	| "TTO"
	| "TUN"
	| "TUR"
	| "GBR"
	| "USA"
	| "URY"
	| "VUT"
	| "ZMB";
