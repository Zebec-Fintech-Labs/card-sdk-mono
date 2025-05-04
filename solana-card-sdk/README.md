# Zebec Instant Card SDK

An sdk for interacting with zebec instant card program in solana.

## Usage

### Create ZebecCardService instance

To use this sdk, you are required to create a instance of ZebecCardService.

```ts
const network = "mainnet-beta";
const connection = new Connection(clusterApiUrl(network));
const wallet = <Anchor Wallet>;
const provider = createAnchorProvider(connection, wallet);

const service = new ZebecCardServiceBuilder()
 .setNetwork(network)
 .setProvider(provider)
 .setProgram()
 .build();
```

If you are using the service only for fetching pda data, then you don't need to pass provider which then will create and set ReadonlyProvider or you can explicitly set ReadonlyProvider.
Also you can use `ZebecConnectionProvider` to create program instance for such case.

```ts
const network = "mainnet-beta";
const connection = new Connection(clusterApiUrl(network));
const provider = createReadonlyProvider(connection);

const service = new ZebecCardServiceBuilder()
 .setNetwork(network)
 .setProvider(provider) // provider can be left empty as it defaults to ReadonlyProvider if provider is not given.
 .setProgram()
 .build();
```

### Direct Card Purchase Using USDC

This functionality is used to buy card directly using USDC. For this you need to invoke `buyCardDirect` method in service instance. Every card purchase has a counter that act as an index which can be fetched using `getNextBuyerCounter` method. It should be passed in the params along with other params.

```ts
import {hashSHA256} from "@zebec-network/core-utils"

const mintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const amount = "100";

const cardType: CardType = "silver";
const buyerEmail = hashSHA256(parseEmailString("abcd@gmail.com"));

const nextBuyerCounter = await service.getNextBuyerCounter();
console.debug("buyer counter", nextBuyerCounter);

const params: BuyCardDirectParams = {
 amount: parseDecimalString(amount),
 cardType,
 nextBuyerCounter,
 buyerAddress,
 mintAddress,
 buyerEmail,
};
const payload = await service.buyCardDirect(params);

const simulationResult = await payload.simulate();
console.log("simulation:", simulationResult);

// const signature = await payload.execute({
//  commitment: "confirmed",
//  preflightCommitment: "confirmed",
// });
// console.log("signature", getTxUrl(signature, network));
```

### Direct Card Purchase From Tokens Other Than USDC

For making card purchase from tokens other than usdc, You are first required to get quote info for given input token and amount. For this you need to call
`getQuoteInfo` method inside the service instance. Then like in card purchase through USDC, you are required to fetch buyers counter by calling `getNextBuyerCounter` and then after, you need to pass the results from previous calls along with some other params to swapAndBuyCardDirect method.

```ts
import {hashSHA256} from "@zebec-network/core-utils"

const cardType: CardType = "silver";
const buyerEmail = await hashSHA256("ashishspkt6566@gmail.com");
const inputMintAddress = "ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU";
const outputMintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const inputAmount = parseDecimalString("5300");
const slippagePercent = parsePercentString("0.01");

const quoteInfo = await service.getQuoteInfo({
 inputAmount,
 inputMintAddress,
 outputMintAddress,
 slippagePercent,
 swapMode: "ExactIn",
});

console.log("quoteInfo", quoteInfo);

const nextBuyerCounter = await service.getNextBuyerCounter();
console.debug("buyer counter", nextBuyerCounter);

const params: SwapAndBuyCardDirectParams = {
 quoteInfo,
 buyerAddress,
 cardType,
 nextBuyerCounter,
 buyerEmail,
};

const payload = await service.swapAndBuyCardDirect(params);

const result = await payload.simulate();
console.log("result", result);

// const signature = await payload.execute();
// console.log("signature", signature);
```

### Fetch user purchase record of a day

```ts
const buyerAddress = provider.publicKey.toString();
console.log("buyer", buyerAddress);

const userPurchaseRecordPda = deriveUserPurchaseRecordPda(buyerAddress, service.program.programId);
const info: UserPurchaseRecordInfo = await service.getUserPurchaseRecord(userPurchaseRecordPda);

console.log("info", info);
```

### Fetch card purchase info

```ts
const buyerAddress = buyerPubkey.toString();
// console.log("buyer", buyerAddress);
const buyerCounter = BigInt("182");

const buyerPda = deriveCardPurchaseInfoPda(buyerAddress, service.program.programId, buyerCounter);
// console.log("buyerpda:", buyerPda.toString());
const info: CardPurchaseInfo = await service.getCardPurchaseInfo(buyerPda);

console.log("info", info);
```

### Initialize Card Config

Card config can be initialize only one time in the program.

```ts
const feeTiers = parseFeeTiers([
 { minAmount: "5", maxAmount: "100", feePercent: "6.5" },
 { minAmount: "101", maxAmount: "500", feePercent: "3" },
 { minAmount: "501", maxAmount: "1000", feePercent: "0.5" },
]);

const zicOwnerAddress = provider.publicKey.toString();
const cardVaultAddress = "5Eu8577bGqoRPNbCmJfJk2wUfN8FwuVPEThNFygaaFH9";
const revenueVaultAddress = "3UksGKzKJZtbpzW9o2yhtUVCYpKn5c91XqmSEgJG1j4B";
const commissionVaultAddress = "3UksGKzKJZtbpzW9o2yhtUVCYpKn5c91XqmSEgJG1j4B";

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
console.log("signature", signature);
```

If you need to update card config use `setCardConfig` method.

### Update Card Config

```ts
const zicOwnerAddress = provider.publicKey.toString();
const cardVaultAddress = "41NWe3jQEQCiudncfVUq7uEMpBtSmsnmEX9fZTiZSTAP";
const revenueVaultAddress = "2amZiVsTuVuJfG3PwKkPwVBNWHsfRoLxEW2wkadPT6D4";
const commissionVaultAddress = "2amZiVsTuVuJfG3PwKkPwVBNWHsfRoLxEW2wkadPT6D4";
const revenueFeePercent = "2.5";
const nativeFeePercent = "1.5";
const nonNativeFeePercent = "5";
const minCardAmount = "10";
const maxCardAmount = "1500";
const dailyCardPurchaseLimit = "1500";

const feeTiers = parseFeeTiers([
 { minAmount: "5", maxAmount: "100", feePercent: "6.5" },
 { minAmount: "101", maxAmount: "500", feePercent: "3" },
 { minAmount: "501", maxAmount: "1500", feePercent: "0.5" },
]);

const params: SetCardConfigParams = {
 revenueFeePercent: parsePercentString(revenueFeePercent),
 nativeFeePercent: parsePercentString(nativeFeePercent),
 nonNativeFeePercent: parsePercentString(nonNativeFeePercent),
 commissionVaultAddress,
 zicOwnerAddress,
 cardVaultAddress,
 revenueVaultAddress,
 feeTiers,
 newZicOwnerAddress: getProviders(network)[0].publicKey.toString(),
 maxCardAmount: parseDecimalString(maxCardAmount),
 minCardAmount: parseDecimalString(minCardAmount),
 dailyCardPurchaseLimit: parseDecimalString(dailyCardPurchaseLimit),
};

const payload = await service.setCardConfig(params);

const signature = await payload.execute();

console.log("signature", signature);
```

### Fetch config data

```ts
const info: CardConfigInfo = await service.getCardConfigInfo();

console.log("info", info);
console.log("feeTiers", info.providerConfig.feeTiers);
```

### Fetch all card purchase info of a user

```ts
const buyerAddress = "<wallet public key>";

const infos: CardPurchaseInfo[] = await service.getAllCardPurchaseInfo(buyerAddress);

console.log("infos", infos);
```

### Create CardBotService instance

```ts
const network = "mainnet-beta";
const connection = new Connection(clusterApiUrl(network));
const wallet = <Anchor Wallet>;
const provider = createAnchorProvider(connection, wallet);

const service = new CardBotServiceBuilder()
 .setNetwork(network)
 .setProvider(provider)
 .setProgram()
 .build();
```

```ts
const network = "mainnet-beta";
const connection = new Connection(clusterApiUrl(network));
const provider = createReadonlyProvider(connection);
const readonlyService = new CardBotServiceBuilder()
 .setNetwork(network)
 .setProvider(provider) // provider can be left empty as it defaults to ReadonlyProvider if provider is not given.
 .setProgram()
 .build();
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

### Create OnRampService instance

```ts
const network = "mainnet-beta";
const connection = new Connection(clusterApiUrl(network));
const wallet = <Anchor Wallet>;
const provider = createAnchorProvider(connection, wallet);

const service = new OnRampServiceBuilder()
 .setNetwork(network)
 .setProvider(provider)
 .setProgram()
 .build();
```

```ts
const network = "mainnet-beta";
const connection = new Connection(clusterApiUrl(network));
const provider = createReadonlyProvider(connection);
const readonlyService = new OnRampServiceBuilder()
 .setNetwork(network)
 .setProvider(provider) // provider can be left empty as it defaults to ReadonlyProvider if provider is not given.
 .setProgram()
 .build();
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
