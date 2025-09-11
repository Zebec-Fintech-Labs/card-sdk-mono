export type Quote = {
	price: number; // Total token amount needed for the USD purchase
	fluctuationPercentage: number; // Amount of USD the user wants to purchase
	token: string; // Timestamp when the quote was generated
};

export type BobaChainId = 288 | 28882;
