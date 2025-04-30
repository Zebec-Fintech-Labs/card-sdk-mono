# Zebec Instant Card SDK

An sdk for interacting with zebec instant card program in solana.

## Usage

To use this sdk, you are required to create a instance of ZebecCardService.

```ts
const connection = new Connection(process.env.RPC_URL || clusterApiUrl("mainnet-beta"));
const wallet = useAnchorWallet(); // Note: only in frontend. Use `Wallet` class from anchor to create wallet instance for backends.
assert(wallet, "May be wallet is not connected.");
const provider = getAnchorProvider(connection, wallet);
const program = ZebecCardProgramFactory.getProgram(provider);
const instructions = new ZebecCardInstructions(program);
const service = new ZebecCardService(instructions, connection, wallet.signTranaction);
```

If you are using the service only for fetching pda data, then you don't need to pass third argument which signTransaction function.
Also you can use `ZebecConnectionProvider` to create program instance for such case.

```ts
const provider = getZebecConnectionProvider(connection);
const program = ZebecCardProgramFactory.getProgram(provider);
const instructions = new ZebecCardInstructions(program);
const service = new ZebecCardService(instructions, connection);
```

### Direct Card Purchase Using USDC

This functionality is used to buy card directly using USDC. For this you need to invoke `buyCardDirect` method in service instance. Every card purchase has a counter that act as an index which can be fetched using `getNextBuyerCounter` method. It should be passed in the params along with other params.

```ts
const amount = "100";
const buyerEmail = parseEmailString("ashishspkt6566@gmail.com");
const mintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // must be Usdc

const cardTypeId: CardTypeId = "103115238587"; // this is fixed and points to specific card type that zebec support currently.

const nextBuyerCounter = await service.getNextBuyerCounter();
console.debug("buyer counter", nextBuyerCounter);

const params: BuyCardDirectParams = {
	amount: parseDecimalString(amount),
	buyerAddress,
	buyerEmail,
	cardTypeId,
	mintAddress,
	nextBuyerCounter,
};
const payload = await service.buyCardDirect(params);

// const simulationResult = await payload.execute();
// console.log("simulation:", simulationResult);

const signature = await payload.execute({
	commitment: "finalized",
	preflightCommitment: "finalized",
});
```

### Direct Card Purchase From Tokens Other Than USDC

For making card purchase from tokens other than usdc, You are first required to get quote info for given input token and amount. For this you need to call
`getQuoteInfo` method inside the service instance. Then like in card purchase through USDC, you are required to fetch buyers counter by calling `getNextBuyerCounter` and then after, you need to pass the results from previous calls along with some other params to swapAndBuyCardDirect method.

```ts
const inputMintAddress = "zebeczgi5fSEtbpfQKVZKCJ3WgYXxjkMUkNNx7fLKAF";
const outputMintAddress = "<usdc mint address>"; // fixed params.
const inputAmount = parseDecimalString("12.35");
const slippagePercent = parsePercentString("0.01");

const quoteInfo = await service.getQuoteInfo({
	inputAmount,
	inputMintAddress,
	outputMintAddress,
	slippagePercent,
	swapMode: "ExactIn",
});

const nextBuyerCounter = await service.getNextBuyerCounter();
console.debug("buyer counter", nextBuyerCounter);

const buyerAddress = "<wallet public key string>";
const buyerEmail = parseEmailString("ashishspkt6566@gmail.com");
const cardTypeId: CardTypeId = "103115238587";
const params: SwapAndBuyCardDirectParams = {
	buyerAddress,
	buyerEmail,
	cardTypeId,
	quoteInfo,
	nextBuyerCounter,
};

const payload = await service.swapAndBuyCardDirect(params);

const signature = await payload.execute({
	commitment: "confirmed",
	preflightCommitment: "confirmed",
});
console.log("signature", signature);
```

### Deposit USDC To Vault

While depositing usdc, a unique pda for each deposit is generated from buyers address, a seed phrase and a counter and is initialized.
This pda holds data such as amount deposited, type of card requested, etc. The counter is validated in program such that it should be
the index in card pda plus one. The service instance provides a method for getting next counter.

```ts
const userAddress = "<wallet public key>";
const mintAddress = "<usdc mint address>";
const amount = "100";
const params: DepositParams = {
	amount: parseDecimalString(amount),
	userAddress,
	mintAddress,
};

const payload = await service.deposit(params);

const signature = await payload.execute();
```

### Deposit Token Other Than USDC To Vault

The deposit token other than USDC involves two instructions i.e. Swap and Deposit. For this the `swapAndDeposit` method
swaps the given input mint to USDC and then it is deposited to the vault. If the swap mode is `ExactIn` means the slippage is
acted on output mint while if you specify swapMode as `ExactOut` then in this case the slippage is on the input amount.

```ts
const userAddress = provider.publicKey.toString();
j;
const inputAmount = "0.01";
const inputMintAddress = "So11111111111111111111111111111111111111112";
// const inputMintAddress = "zebeczgi5fSEtbpfQKVZKCJ3WgYXxjkMUkNNx7fLKAF";
const outputMintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const slippagePercent = 0.3;

const quoteInfo = await service.getQuoteInfo({
	inputAmount: parseDecimalString(inputAmount),
	inputMintAddress,
	outputMintAddress,
	slippagePercent: parsePercentString(slippagePercent),
	swapMode: "ExactIn",
});

const params: SwapAndDepositParams = {
	userAddress,
	quoteInfo,
};
const payload = await service.swapAndDeposit(params);

const signature = await payload.execute();
```

### Card Purchase From Vault

To purchase card you need to call buycard method. It transfers usdc from user's vault to card vault after deducting commission and revenue fee.

```ts
const buyerAddress = "<wallet public key>";
const mintAddress = "<usdc mint address>";
const amount = "5";
const cardTypeId: CardTypeId = "103115238587";
const buyerEmail = parseEmailString("abc@gmail.com");

const nextBuyerCounter = await service.getNextBuyerCounter();
console.debug("next buyer counter", nextBuyerCounter);

const params: BuyCardParams = {
	amount: parseDecimalString(amount),
	cardTypeId,
	nextBuyerCounter,
	buyerAddress,
	mintAddress,
	buyerEmail,
};
const payload = await service.buyCard(params);

const signature = await payload.execute();
```

### Withdraw

```ts
const userAddress = "<wallet public key>";
const mintAddress = "<usdc mint address>";
const amount = "10";

const params: WithdrawParams = {
	amount: parseDecimalString(amount),
	userAddress,
	mintAddress,
};

const payload = await service.withdraw(params);

const signature = await payload.execute();
```

### Initialize Card Config

Card config can be initialize only one time in the program.

```ts
const zicOwnerAddress = provider.publicKey.toString();
const cardVaultAddress = "7yJfc32yFeRWTsPQjon38zEuKPGQLbAy8hoz3CVa5A8u";
const revenueVaultAddress = "9EYFiACQrVYYYZaZiE6gD82TfUPXu9FqABbckVMRvHLV";
const commissionVaultAddress = "2efiJoaS2C6tEgWWhXaHxWDPJBk6XLL3TVS6ERXx4AX4";

const feeTiers = parseFeeTiers([
	{ minAmount: "5", maxAmount: "100", feePercent: "6.5" },
	{ minAmount: "101", maxAmount: "500", feePercent: "3" },
	{ minAmount: "501", maxAmount: "1000", feePercent: "0.5" },
]);

const revenueFeePercent = "2.5";
const nativeFeePercent = "1.5";
const nonNativeFeePercent = "5";
const usdcAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const minCardAmount = "5";
const maxCardAmount = "500";
const dailyCardPurchaseLimit = "1000";

const params: InitCardConfigParams = {
	revenueFeePercent: parsePercentString(revenueFeePercent),
	nativeFeePercent: parsePercentString(nativeFeePercent),
	nonNativeFeePercent: parsePercentString(nonNativeFeePercent),
	zicOwnerAddress,
	usdcAddress,
	commissionVaultAddress,
	cardVaultAddress,
	revenueVaultAddress,
	maxCardAmount: parseDecimalString(maxCardAmount),
	minCardAmount: parseDecimalString(minCardAmount),
	feeTiers,
	dailyCardPurchaseLimit: parseDecimalString(dailyCardPurchaseLimit),
};

const payload = await service.initCardConfig(params);

const signature = await payload.execute({ commitment: "confirmed" });
```

If you need to update card config use `setCardConfig` method.

### Update Card Config

```ts
const zicOwnerAddress = provider.publicKey.toString();
const cardVaultAddress = "7yJfc32yFeRWTsPQjon38zEuKPGQLbAy8hoz3CVa5A8u";
const revenueVaultAddress = "9EYFiACQrVYYYZaZiE6gD82TfUPXu9FqABbckVMRvHLV";
const commissionVaultAddress = "2efiJoaS2C6tEgWWhXaHxWDPJBk6XLL3TVS6ERXx4AX4";
const revenueFeePercent = "2.5";
const nativeFeePercent = "1.5";
const nonNativeFeePercent = "5.0";
const minCardAmount = "5";
const maxCardAmount = "1000";
const dailyCardPurchaseLimit = "100";
const feeTiers: FeeTier[] = [
	{
		minAmount: "5",
		maxAmount: "100",
		feePercent: "6.5",
	},
	{
		minAmount: "101",
		maxAmount: "500",
		feePercent: "3.0",
	},
	{
		minAmount: "501",
		maxAmount: "1000",
		feePercent: "0.5",
	},
].map<FeeTier>((ft) => {
	return {
		feePercent: parsePercentString(ft.feePercent),
		maxAmount: parseDecimalString(ft.maxAmount),
		minAmount: parseDecimalString(ft.minAmount),
	};
});

const params: SetCardConfigParams = {
	revenueFeePercent: parsePercentString(revenueFeePercent),
	nativeFeePercent: parsePercentString(nativeFeePercent),
	nonNativeFeePercent: parsePercentString(nonNativeFeePercent),
	commissionVaultAddress,
	zicOwnerAddress,
	cardVaultAddress,
	revenueVaultAddress,
	feeTiers,
	maxCardAmount: parseDecimalString(maxCardAmount),
	minCardAmount: parseDecimalString(minCardAmount),
	dailyCardPurchaseLimit: parseDecimalString(dailyCardPurchaseLimit),
};

const payload = await service.setCardConfig(params);
const signature = await payload.execute();
```

### Fetch config data

```ts
const configData: CardConfigInfo = await service.getCardConfigInfo();
console.log("configData", configData);
```

### Fetch user purchase record of a day

```ts
const buyerAddress = "<pubkey string>";
const userPurchaseRecordPda = ZebecCardService.deriveUserPurchaseRecordPda(
	buyerAddress,
	program.programId,
);
const info: UserPurchaseRecordInfo = await service.getUserPurchaseRecord(userPurchaseRecordPda);

console.log("info", info);
```

### Fetch user vault balance

```ts
const balance: string = await service.getUserVaultBalance(userAddress, mintAddress);

console.log("balance:", balance);
```

### Fetch card purchase info

```ts
const buyerAddress = "<wallet public key>";
const buyerCounter = BigInt("1");

const buyerPda = ZebecCardService.deriveBuyerPda(buyerAddress, program.programId, buyerCounter);
const info: CardPurchaseInfo = await service.getCardPurchaseInfo(buyerPda);

console.log("info", info);
```

### Fetch all card purchase info of a user

```ts
const buyerAddress = "<wallet public key>";

const infos: CardPurchaseInfo[] = await service.getAllCardPurchaseInfo(buyerAddress);

console.log("infos", infos);
```

### Use Vault Deposits To Generate Yield

```ts
const userAddress = provider.publicKey.toString();
const amount = parseDecimalString("1");
const mintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const params = {
	amount,
	userAddress,
	mintAddress,
};

const payload = await service.generateYield(params);

console.log(await payload.execute({ commitment: "confirmed" }));
```

### Withdraw Yield Amounts

```ts
const amount = "5";

const params: WithdrawYieldParams = {
	amount: parseDecimalString(amount),
	userAddress,
	mintAddress,
	withdrawAll: true,
};

const payload = await service.withdrawYield(params);

const sig = await payload.execute();
console.log("signature:", sig);
```

### Card Bot Init Config

```ts
const botAdminAddress = parsePublicKeyString("EcbeemyUhRhogppTHaGja2axU7PpZ2opPigry8qWDj1L");

const params: InitBotConfigParams = {
	zicOwnerAddress,
	botAdminAddress,
};

const payload = await service.initBotConfig(params);

const signature = await payload.execute({
	preflightCommitment: "confirmed",
	commitment: "confirmed",
});
console.log("signature", signature);
```

### Get Card Bot Config

```ts
const info = await service.getCardBotConfigInfo();

console.log("info", info);
```

### Init BotUserCustody Account

```ts
const botAdminAddress = parsePublicKeyString(provider.publicKey.toString());
const usdcMintAddress = parsePublicKeyString("De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc");
const userId = "0001";

const params: InitBotUserCustodyParams = {
	botAdminAddress,
	usdcMintAddress,
	userId,
};

const payload = await service.initBotUserCustody(params);

const signature = await payload.execute({
	preflightCommitment: "confirmed",
	commitment: "confirmed",
});
console.log("signature", signature);
```

### Buy Card Through Bot

```ts
const botAdminAddress = parsePublicKeyString(provider.publicKey.toString());
const usdcMintAddress = parsePublicKeyString("De31sBPcDejCVpZZh1fq8SNs7AcuWcBKuU3k2jqnkmKc");
const userId = "0001";
const amount = parseDecimalString(100);

const params: BuyCardThroughBotParams = {
	amount,
	botAdminAddress,
	userId,
	usdcMintAddress,
};

const payload = await service.buyCardThroughBot(params);

const signature = await payload.execute({
	preflightCommitment: "confirmed",
	commitment: "confirmed",
});
console.log("signature", signature);
```

### Get BotUserCustody Info

```ts
const userId = "0001";

const userCustody = ZebecCardService.deriveBotUserCustodyPda(userId, program.programId);
console.log("userCustody:", userCustody.toString());
const info = await service.getBotUserCustodyInfo(userCustody);

console.log("info", info);
```

### Init Onramp config

```ts
const zicOwnerAddress = parsePublicKeyString(provider.publicKey.toString());
const onRampAdminAddress = parsePublicKeyString("H2Bi1cjEJzHcLcFDzCJoVahtwN2dh1eG325VLhFc8r8C");
const zbcnAddress = parsePublicKeyString("ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU");

const params: InitOnRampConfigParams = {
	zicOwnerAddress,
	onRampAdminAddress,
	zbcnAddress,
};

const payload = await service.initOnRampConfig(params);

const signature = await payload.execute();
console.log("signature", signature);
```

### Get Onramp config

```ts
const info = await service.getOnRampConfigInfo();

console.log("info", info);
```

### Init Onramp User Custody

```ts
const onRampAdminAddress = parsePublicKeyString(provider.publicKey.toString());
const userId = "0004";

const params: InitOnRampUserCustodyParams = {
	onRampAdminAddress,
	userId,
};

const payload = await service.initOnRampUserCustody(params);

const signature = await payload.execute({
	preflightCommitment: "confirmed",
	commitment: "confirmed",
});
console.log("signature", signature);
```

### Get Onramp User Custody Info

```ts
const userId = "0004";
const userCustody = ZebecCardService.deriveOnRampUserCustodyPda(userId, program.programId);
console.log("user custody:", userCustody.toString());

const info = await service.getOnRampUserCustodyInfo(userCustody);

console.log("info", info);
```

### Onramp Transfer ZBCN

```ts
const onRampAdminAddress = parsePublicKeyString(provider.publicKey.toString());
const receiverAddress = parsePublicKeyString("41NWe3jQEQCiudncfVUq7uEMpBtSmsnmEX9fZTiZSTAP");

const senderUserId = "0003";
const amount = parseDecimalString(100);

const params: OnRampTransferZbcnParams = {
	onRampAdminAddress,
	senderUserId,
	durationInDays: 2,
	receiverAddress,
	amount,
};

const payload = await service.onRampTransferZbcn(params);

const signature = await payload.execute({
	preflightCommitment: "confirmed",
	commitment: "confirmed",
});
console.log("signature", signature);
```
