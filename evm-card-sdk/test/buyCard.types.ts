import type { BlackCardSignatureData, BuyCardParams, CardV2SignatureData, SwapData } from "../src";

const swapData = {} as Omit<SwapData, "gas" | "gasPrice">;
const signatureData = {} as CardV2SignatureData;
const blackSignatureData = {} as BlackCardSignatureData;
const buyerEmail = "user@example.com";

const directSilver: BuyCardParams = { amount: "10", cardType: "silver", buyerEmail };
const directCarbonV2: BuyCardParams = {
	amount: "10",
	cardType: "carbon",
	buyerEmail,
	signatureData,
};
const directBlack: BuyCardParams = {
	amount: "10",
	cardType: "black",
	buyerEmail,
	signatureData: blackSignatureData,
};
const swapSilver: BuyCardParams = { swapData, cardType: "silver", buyerEmail };
const swapCarbonV2: BuyCardParams = {
	swapData,
	cardType: "carbon",
	buyerEmail,
	signatureData,
};
const swapBlack: BuyCardParams = {
	swapData,
	cardType: "black",
	buyerEmail,
	signatureData: blackSignatureData,
};
const odysseyCarbon: BuyCardParams = {
	ether: "0.1",
	slippage: 1,
	cardType: "carbon",
	buyerEmail,
};

// @ts-expect-error amount and swapData are mutually exclusive
const bothPaymentMethods: BuyCardParams = {
	amount: "10",
	swapData,
	cardType: "silver",
	buyerEmail,
};

// @ts-expect-error amount, swapData, or ether is required
const missingPaymentMethod: BuyCardParams = { cardType: "silver", buyerEmail };

// @ts-expect-error black cards require signatureData
const missingBlackSignature: BuyCardParams = { amount: "10", cardType: "black", buyerEmail };

// @ts-expect-error black cards require BlackCardSignatureData
const regularBlackSignature: BuyCardParams = {
	amount: "10",
	cardType: "black",
	buyerEmail,
	signatureData,
};

// @ts-expect-error Odyssey swaps do not support v2 signature data
const odysseyV2: BuyCardParams = {
	ether: "0.1",
	slippage: 1,
	cardType: "silver",
	buyerEmail,
	signatureData,
};

// @ts-expect-error Odyssey swaps do not support black cards
const odysseyBlack: BuyCardParams = {
	ether: "0.1",
	slippage: 1,
	cardType: "black",
	buyerEmail,
	signatureData: blackSignatureData,
};

// @ts-expect-error amount and ether are mutually exclusive
const directWithEther: BuyCardParams = {
	amount: "10",
	ether: "0.1",
	slippage: 1,
	cardType: "silver",
	buyerEmail,
};

// @ts-expect-error Odyssey swaps require slippage
const odysseyMissingSlippage: BuyCardParams = {
	ether: "0.1",
	cardType: "silver",
	buyerEmail,
};

void directSilver;
void directCarbonV2;
void directBlack;
void swapSilver;
void swapCarbonV2;
void swapBlack;
void odysseyCarbon;
void bothPaymentMethods;
void missingPaymentMethod;
void missingBlackSignature;
void regularBlackSignature;
void odysseyV2;
void odysseyBlack;
void directWithEther;
void odysseyMissingSlippage;
