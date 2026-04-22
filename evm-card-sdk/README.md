# EVM Zebec Card SDK

An SDK for interacting with Zebec Instant Card EVM contracts.

## Installation

```bash
npm install @zebec-network/evm-card-sdk

yarn add @zebec-network/evm-card-sdk
```

## Supported Chains

| Chain           | Chain ID |
| --------------- | -------- |
| Ethereum        | 1        |
| Sepolia         | 11155111 |
| Base            | 8453     |
| BSC             | 56       |
| BSC Testnet     | 97       |
| Odyssey         | 153153   |
| Odyssey Testnet | 131313   |
| Polygon         | 137      |
| Polygon Amoy    | 80002    |

The `SupportedChain` enum and `parseSupportedChain` helper are exported for use with chain IDs.

---

## Quick Start

```ts
import { ZebecCardService, SupportedChain } from "@zebec-network/evm-card-sdk";
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const service = new ZebecCardService(signer, SupportedChain.Sepolia);
```

> **Odyssey chains** (`OdysseyTestnet`, `Odyssey`) use a different contract (`OdysseyZebecCard`) and support a different set of methods. See chain-specific notes in each method below.

---

## API Reference

### `ZebecCardService`

#### Constructor

```ts
new ZebecCardService(signer: ethers.Signer, chainId: number)
```

| Parameter | Type             | Description                          |
| --------- | ---------------- | ------------------------------------ |
| `signer`  | `ethers.Signer`  | Ethers signer from your wallet       |
| `chainId` | `number`         | One of the supported chain IDs above |

**Public properties:**

| Property    | Type                            | Description                        |
| ----------- | ------------------------------- | ---------------------------------- |
| `zebecCard` | `ZebecCard \| OdysseyZebecCard` | Main Zebec Card contract           |
| `usdcToken` | `Token`                         | USDC ERC-20 contract               |
| `weth`      | `Weth`                          | WETH contract                      |
| `signer`    | `ethers.Signer`                 | Signer passed to the constructor   |
| `chainId`   | `number`                        | Chain ID passed to the constructor |

---

### Token Utilities

#### `approve`

Approves a token spender. Only submits a transaction if the current allowance is less than the requested amount. Returns `null` if no approval is needed.

```ts
const tx = await service.approve({
  token: tokenAddress,   // ERC-20 token address
  spender: spenderAddress,
  amount: "1000",        // Human-readable amount (e.g. USDC units)
});

if (tx) {
  const receipt = await tx.wait();
  console.log("approval hash:", receipt?.hash);
}
```

#### `wrapEth`

Wraps native ETH into WETH.

```ts
const tx = await service.wrapEth({ amount: "0.001" });
const receipt = await tx.wait();
console.log("txHash:", receipt?.hash);
```

---

### Card Purchase

#### `buyCardDirect`

Buys a card in a single transaction — USDC is pulled directly from the user's wallet (no prior vault deposit needed). Requires approval of the `ZebecCard` contract to spend USDC. Works on all supported chains.

```ts
const token = await service.usdcToken.getAddress();
const spender = await service.zebecCard.getAddress();
const amount = "199";

const approval = await service.approve({ token, spender, amount });
if (approval) {
  await approval.wait();
}

const tx = await service.buyCardDirect({
  amount,
  cardType: "carbon",
  buyerEmail: "user@example.com",
});
const receipt = await tx.wait();
console.log("txhash:", receipt?.hash);
```

Card type mapping:

| `cardType` value | Contract value     |
| ---------------- | ------------------ |
| `"silver"`       | `"non_reloadable"` |
| `"carbon"`       | `"reloadable"`     |

---

### Swap & Buy

These methods allow users to pay with tokens other than USDC. The contract handles the swap to USDC internally.

> **Non-Odyssey chains** use the 1inch aggregator. **Odyssey chains** use a native ETH swap path.

#### Fetching Swap Quote

Fetch swap data from the Zebec backend before calling swap methods:

```ts
const urlParams = new URLSearchParams({
  src,               // source token address
  dst,               // destination token address (USDC)
  from,              // user wallet address
  origin,            // user wallet address
  amount,            // amount in source token smallest unit
  slippage: "5",
  compatibility: "true",
  chainId: chainId.toString(),
  receiver,          // ZebecCard contract address
  disableEstimate: "true",
});

const url = `https://api.card.zebec.io/swap/get1inchswapquotes?${urlParams}`;
const swapData = await fetch(url, {
  headers: { Accept: "application/json", "Content-Type": "application/json; charset=utf-8" },
}).then((r) => r.json());
```

#### `swapAndBuyCardDirect`

Swaps a source token to USDC and buys a card in one transaction. **Non-Odyssey chains only.**

Requires approval of the `ZebecCard` contract to spend the source token.

```ts
const approval = await service.approve({
  token: srcTokenAddress,
  spender: await service.zebecCard.getAddress(),
  amount: srcAmount,
});
if (approval) await approval.wait();

const tx = await service.swapAndBuyCardDirect({
  swapData,
  cardType: "carbon",
  buyerEmail: "user@example.com",
});
const receipt = await tx.wait();
console.log("txhash:", receipt?.hash);
```

#### `swapAndBuyCardOdyssey`

Swaps native ETH to USDC and buys a card in one transaction. **Odyssey chains only.**

```ts
const tx = await service.swapAndBuyCardOdyssey({
  cardType: "silver",
  buyerEmail: "user@example.com",
  ether: "1265",   // Amount of native ETH (in smallest unit)
  slippage: 1,     // Slippage tolerance in percent
});
const receipt = await tx.wait();
console.log("txhash:", receipt?.hash);
```

---

### Query Methods

#### `getUserBalance`

Returns the user's USDC vault balance as a human-readable string.

```ts
const balance = await service.getUserBalance({ userAddress: signerAddress });
console.log("balance:", balance);
```

#### `getCardPurhcaseOfDay`

Returns the user's card purchase info for the current day.

```ts
const purchase = await service.getCardPurhcaseOfDay({ userAddress: signerAddress });
console.log("total purchased today:", purchase.totalCardPurchased);
console.log("timestamp:", purchase.cardPurchasedTimestamp);
```

Returns a `CardPurchaseOfDay` object:

```ts
{
  totalCardPurchased: string;     // Total USDC value purchased today
  cardPurchasedTimestamp: number; // Unix timestamp of last purchase
}
```

#### `getCardConfig`

Returns the current contract configuration.

```ts
const config = await service.getCardConfig();
console.log(config);
```

Returns a `CardConfig` object:

```ts
{
  nativeFeePercent: string;
  nonNativeFeePercent: string;
  revenueFeePercent: string;
  totalCardSold: bigint;
  cardVault: string;
  revenueVault: string;
  commissionVault: string;
  usdcAddress: string;
  minCardAmount: string;
  maxCardAmount: string;
  dailyCardPurchaseLimit: string;
}
```

#### `getFeeTiers`

Returns configured fee tiers.

```ts
const tiers = await service.getFeeTiers();
// [{ feePercent: "1.5", minAmount: "0", maxAmount: "500" }, ...]
```

#### `getAdmin`

Returns the admin (owner) address of the contract.

```ts
const admin = await service.getAdmin();
console.log("admin:", admin);
```

#### `getCustomFee`

Returns the custom fee configured for a specific token, as a percentage string.

```ts
const fee = await service.getCustomFee({ tokenAddress: "0x..." });
console.log("fee:", fee); // e.g. "2.5"
```

#### `getReloadableFee`

Returns the reloadable (carbon) card fee as a percentage string. **Non-Odyssey chains only.**

```ts
const fee = await service.getReloadableFee();
console.log("reloadable fee:", fee);
```

#### `getMinimumUsdcAmount`

Returns the minimum USDC amount for a given ETH amount with slippage applied. **Odyssey chains only.**

```ts
const minUsdc = await service.getMinimumUsdcAmount("1265", 1);
console.log("min USDC:", minUsdc);
```

---

### Admin Methods

Admin methods can only be called by the contract owner. Use a `ZebecCardService` instance created with the admin signer.

#### `setNativeFee`

```ts
await (await service.setNativeFee({ feeInPercent: "1.5" })).wait();
```

#### `setNonNativeFee`

```ts
await (await service.setNonNativeFee({ feeInPercent: "2.5" })).wait();
```

#### `setRevenueFee`

```ts
await (await service.setRevenueFee({ feeInPercent: "5.0" })).wait();
```

#### `setRevenueVault`

```ts
await (await service.setRevenueVault({ vaultAddress: "0x..." })).wait();
```

#### `setCommissionVault`

```ts
await (await service.setCommissionVault({ vaultAddress: "0x..." })).wait();
```

#### `setCardVault`

```ts
await (await service.setCardVault({ vaultAddress: "0x..." })).wait();
```

#### `setUsdcAddress`

```ts
await (await service.setUsdcAddress({ tokenAddress: "0x..." })).wait();
```

#### `setMinCardAmount`

```ts
await (await service.setMinCardAmount({ minCardAmount: "10" })).wait();
```

#### `setMaxCardAmount`

```ts
await (await service.setMaxCardAmount({ maxCardAmount: "1000" })).wait();
```

#### `setDailyCardPurchaseLimit`

```ts
await (await service.setDailyCardPurchaseLimit({ dailyCardPurchaseLimit: "5000" })).wait();
```

#### `setFee` (Odyssey chains only)

Updates the fee for a given amount range, or inserts a new tier if the range doesn't exist.

```ts
await (await service.setFee({ minAmount: "0", maxAmount: "500", feePercent: "1.5" })).wait();
```

#### `setFeeTiers`

Replaces all fee tiers.

```ts
await (await service.setFeeTiers({
  feeTiers: [
    { feePercent: "1.0", minAmount: "0",   maxAmount: "200" },
    { feePercent: "1.5", minAmount: "200", maxAmount: "500" },
    { feePercent: "2.0", minAmount: "500", maxAmount: "9999" },
  ],
})).wait();
```

#### `setCustomFee`

Sets a custom fee percentage for a specific token.

```ts
await (await service.setCustomFee({ tokenAddress: "0x...", fee: "3.0" })).wait();
```

#### `setReloadableFee` (Non-Odyssey chains only)

Sets the fee for reloadable (carbon) cards.

```ts
await (await service.setReloadableFee({ fee: "1.0" })).wait();
```

---

## Using Contract Factories

The SDK exports Typechain-generated factory classes for creating contract instances directly.

```ts
import { Token__factory, ZebecCard__factory } from "@zebec-network/evm-card-sdk";
import { ethers } from "ethers";

// Create an ERC-20 token contract instance
const token = Token__factory.connect(tokenAddress, signer);
const balance = await token.balanceOf(walletAddress);

// Create a ZebecCard interface for parsing logs
function parseLogs(logs: readonly ethers.Log[]) {
  const iface = ZebecCard__factory.createInterface();
  return logs.map((l) => iface.parseLog(l)).filter(Boolean) as ethers.LogDescription[];
}
```

---

## Parsing Contract Events

Use the ZebecCard interface to decode transaction receipt logs.

```ts
import { ethers } from "ethers";
import { ZebecCard__factory } from "@zebec-network/evm-card-sdk";

const provider = new ethers.JsonRpcProvider(rpcUrl);

function parseLogs(logs: readonly ethers.Log[]) {
  const iface = ZebecCard__factory.createInterface();
  return logs.map((l) => iface.parseLog(l)).filter(Boolean) as ethers.LogDescription[];
}

// Deposited event
const receipt = await provider.getTransactionReceipt(txHash);
const events = parseLogs(receipt!.logs);
const deposited = events.find((e) => e.name === "Deposited");
deposited?.args.forEach((arg, i) => console.log(`arg ${i}:`, arg));

// Withdrawn event
const withdrawn = events.find((e) => e.name === "Withdrawn");

// CardPurchased event
const cardPurchased = events.find((e) => e.name === "CardPurchased");

// Swapped event
const swapped = events.find((e) => e.name === "Swapped");
```

---

## Exported Constants & Helpers

```ts
import {
  SupportedChain,
  ODYSSEY_CHAIN_IDS,
  ZEBEC_CARD_ADDRESS,
  USDC_ADDRESS,
  WETH_ADDRESS,
  ATOKEN_ADDRESS,
  DEFAULT_GAS_LIMIT,
  parseSupportedChain,
} from "@zebec-network/evm-card-sdk";

// Get ZebecCard contract address for a chain
const contractAddress = ZEBEC_CARD_ADDRESS[SupportedChain.Sepolia];

// Parse a raw chain ID to SupportedChain enum (throws if unsupported)
const chain = parseSupportedChain(11155111); // SupportedChain.Sepolia

// Check if a chain is an Odyssey chain
const isOdyssey = ODYSSEY_CHAIN_IDS.includes(chainId);
```

---

## Exported ABIs

Raw ABIs are available for use with other libraries:

```ts
import {
  ZEBEC_CARD_ABI,
  ERC20_TOKEN_ABI,
  WETH_ABI,
  AGGREGATOR_ROUTER_V6_ABI,
} from "@zebec-network/evm-card-sdk";
```

---

## TypeScript Types

```ts
import type {
  CardType,
  CardConfig,
  FeeTier,
  CardPurchaseOfDay,
  SwapData,
  SwapAndBuyCardParams,
  SwapAndBuyCardParamsOdyssey,
} from "@zebec-network/evm-card-sdk";
```

| Type                          | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `CardType`                    | `"silver" \| "carbon"`                           |
| `CardConfig`                  | Full contract configuration object               |
| `FeeTier`                     | `{ feePercent, minAmount, maxAmount }`           |
| `CardPurchaseOfDay`           | `{ totalCardPurchased, cardPurchasedTimestamp }` |
| `SwapData`                    | Swap quote data from the Zebec backend           |
| `SwapAndBuyCardParams`        | Parameters for `swapAndBuyCardDirect`            |
| `SwapAndBuyCardParamsOdyssey` | Parameters for `swapAndBuyCardOdyssey`           |
