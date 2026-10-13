# EVM Zebec Card SDK

An SDK for interacting with Zebec Instant Card EVM contracts.

## Installation

```bash
npm install @zebec-network/evm-card-sdk

yarn add @zebec-network/evm-card-sdk
```

## Supported Chains

| Chain             | Chain ID | Enum value                        |
| ----------------- | -------- | --------------------------------- |
| Ethereum          | 1        | `SupportedChain.Mainnet`          |
| Sepolia           | 11155111 | `SupportedChain.Sepolia`          |
| Base              | 8453     | `SupportedChain.Base`             |
| BSC               | 56       | `SupportedChain.Bsc`              |
| BSC Testnet       | 97       | `SupportedChain.BscTestnet`       |
| Odyssey           | 153153   | `SupportedChain.Odyssey`          |
| Odyssey Testnet   | 131313   | `SupportedChain.OdysseyTestnet`   |
| Polygon           | 137      | `SupportedChain.Polygon`          |
| Polygon Amoy      | 80002    | `SupportedChain.PolygonAmoy`      |
| Robinhood         | 4663     | `SupportedChain.Robinhood`        |
| Robinhood Testnet | 46630    | `SupportedChain.RobinhoodTestnet` |

The `SupportedChain` enum and `parseSupportedChain(chainId)` helper are exported for use with chain IDs. `parseSupportedChain` throws if the chain is unsupported — handy for validating user input before constructing the service.

```ts
import { parseSupportedChain, ODYSSEY_CHAIN_IDS } from "@zebec-network/evm-card-sdk";

const chain = parseSupportedChain(11155111); // SupportedChain.Sepolia
const isOdyssey = ODYSSEY_CHAIN_IDS.includes(chain);
```

---

## Quick Start

```ts
import { ZebecCardService, SupportedChain } from "@zebec-network/evm-card-sdk";
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const service = new ZebecCardService(signer, SupportedChain.Sepolia);
```

> **Odyssey chains** (`OdysseyTestnet`, `Odyssey`) use a different contract (`OdysseyZebecCard`) and support a different set of methods. The service throws `Method not supported for this chain` when you call a method that is not available on the current chain. See chain-specific notes in each method below.

### Two ways to buy a card

The SDK supports two purchase flows:

1. **Direct purchase** (`buyCardDirect`) — single transaction; USDC (or any supported token via `swapAndBuyCardDirect` / `swapAndBuyCardOdyssey`) is pulled from the user's wallet at purchase time. Available on **all chains**.
2. **Vault-based purchase** (`depositUsdc` → `buyCard`) — user first tops up an on-contract USDC vault, then buys cards from that balance. `withdraw` returns unused vault balance. **Non-Odyssey chains only.**

### Gas overrides

Every write method accepts an optional `overrides?: ethers.Overrides`. The SDK applies `DEFAULT_GAS_LIMIT = 3_000_000` when `overrides.gasLimit` is not provided.

---

## API Reference

### `ZebecCardService`

#### Constructor

```ts
new ZebecCardService(signer: ethers.Signer, chainId: number)
```

| Parameter | Type            | Description                          |
| --------- | --------------- | ------------------------------------ |
| `signer`  | `ethers.Signer` | Ethers signer from your wallet       |
| `chainId` | `number`        | One of the supported chain IDs above |

**Public properties:**

| Property    | Type                            | Description                        |
| ----------- | ------------------------------- | ---------------------------------- |
| `zebecCard` | `ZebecCard \| OdysseyZebecCard` | Main Zebec Card contract           |
| `usdcToken` | `Token`                         | USDC ERC-20 contract               |
| `weth`      | `Weth`                          | WETH contract                      |
| `signer`    | `ethers.Signer`                 | Signer passed to the constructor   |
| `chainId`   | `number`                        | Chain ID passed to the constructor |

#### Method availability

| Method                                      | Non-Odyssey | Odyssey | Notes                                    |
| ------------------------------------------- | :---------: | :-----: | ---------------------------------------- |
| `approve` / `wrapEth`                       |     ✅      |   ✅    | Token utilities                          |
| `depositUsdc`                               |     ✅      |   ❌    | Vault top-up                             |
| `withdraw`                                  |     ✅      |   ❌    | Vault withdrawal                         |
| `buyCard`                                   |     ✅      |   ❌    | From vault balance                       |
| `buyCardDirect`                             |     ✅      |   ✅    | From wallet (no vault)                   |
| `buyCardDirectV2`                           |     ✅      |   ❌    | From wallet with backend-signed fee      |
| `buyCardDirectForPartner`                   |     ✅      |   ❌    | Partner direct purchase                  |
| `swapAndDeposit`                            |     ✅      |   ❌    | 1inch swap → vault                       |
| `swapAndBuyCardDirect`                      |     ✅      |   ❌    | 1inch swap → card                        |
| `swapAndBuyCardDirectV2`                    |     ✅      |   ❌    | 1inch swap → card with signed fee        |
| `swapAndBuyForPartner`                      |     ✅      |   ❌    | Partner swap → card                      |
| `swapAndBuyCardOdyssey`                     |     ❌      |   ✅    | Native ETH swap → card                   |
| `setReloadableFee` / `getReloadableFee`     |     ✅      |   ❌    | Carbon (reloadable) card fee             |
| `setFee`                                    |     ❌      |   ✅    | Per-tier fee on Odyssey                  |
| `getMinimumUsdcAmount`                      |     ❌      |   ✅    | Computes min USDC for a given ETH amount |
| `setPartnerConfig` / `setPartnerEnabled`    |     ✅      |   ❌    | Partner admin                            |
| `setPartnerFeeTiers` / `setPartnerTokenFee` |     ✅      |   ❌    | Partner fee admin                        |
| `getPartnerConfig` / `getPartnerFee`        |     ✅      |   ❌    | Partner query                            |
| `getPartnerFeeTiers` / `getPartnerTokenFee` |     ✅      |   ❌    | Partner fee query                        |
| `getUserNonce` / `getV2Admin`               |     ✅      |   ❌    | V2 signature helpers                     |
| All other admin/query                       |     ✅      |   ✅    |                                          |

---

### Token Utilities

#### `approve`

Approves a token spender. Only submits a transaction if the current allowance is less than the requested amount. Returns `null` if no approval is needed.

```ts
const tx = await service.approve({
	token: tokenAddress, // ERC-20 token address
	spender: spenderAddress,
	amount: "1000", // Human-readable amount (e.g. USDC units)
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

### Vault Flow (Non-Odyssey only)

`ZebecCard` keeps a per-user USDC balance ("card vault") on-contract. Top it up with `depositUsdc`, buy cards from it with `buyCard`, and withdraw any leftover with `withdraw`. None of these methods are available on Odyssey chains — they throw `Method not supported for this chain`.

#### `depositUsdc`

Deposits USDC from the user's wallet into their card vault. Requires the `ZebecCard` contract to be approved as an USDC spender first.

```ts
const token = await service.usdcToken.getAddress();
const spender = await service.zebecCard.getAddress();
const amount = "1000";

const approval = await service.approve({ token, spender, amount });
if (approval) await approval.wait();

const tx = await service.depositUsdc({ amount });
await tx.wait();
```

#### `withdraw`

Withdraws USDC from the user's card vault back to their wallet.

```ts
const tx = await service.withdraw({ amount: "5.0" });
await tx.wait();
```

#### `buyCard`

Buys a card by debiting the user's vault balance. The SDK validates locally before submitting:

- email format (via the `isEmailValid` helper)
- vault balance ≥ requested amount
- amount within `minCardAmount` / `maxCardAmount` from `cardConfig`
- daily purchase total ≤ `dailyCardBuyLimit`

```ts
const tx = await service.buyCard({
	amount: "199",
	cardType: "silver",
	buyerEmail: "user@example.com",
});
await tx.wait();
```

#### `swapAndDeposit`

Swaps a source token to USDC via the 1inch aggregator and deposits the result into the user's vault in a single transaction. Use [`fetchSwapData`](#fetching-swap-quote) below to obtain `swapData`. The source token must be approved both for the 1inch router (so the aggregator can pull it) and for the `ZebecCard` contract.

```ts
const tx = await service.swapAndDeposit({ swapData });
await tx.wait();
```

---

### Card Purchase

#### `buyCardDirect`

Buys a card in a single transaction — USDC is pulled directly from the user's wallet (no prior vault deposit needed). Requires approval of the `ZebecCard` contract to spend USDC. Works on **all supported chains**.

The SDK validates email format, amount range, and daily purchase limit before submitting.

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

Card type mapping (handled internally — pass `"silver"` or `"carbon"`):

| `cardType` value | Contract value     |
| ---------------- | ------------------ |
| `"silver"`       | `"non_reloadable"` |
| `"carbon"`       | `"reloadable"`     |

#### `buyCardDirectV2`

Buys a card directly with USDC using a backend-signed fee amount (v2). **Non-Odyssey chains only.**

The backend provides an EIP-712 signature over the fee amount to prevent fee manipulation. The signature is verified on-chain before processing the purchase.

```ts
const tx = await service.buyCardDirectV2({
	amount: "10",
	cardType: "silver",
	buyerEmail: "user@example.com",
	signatureData: {
		feeAmount: "0.5", // USDC fee amount (human-readable)
		signature: "0x...", // EIP-712 signature from backend
	},
});
const receipt = await tx.wait();
console.log("txhash:", receipt?.hash);
```

---

### Swap & Buy

These methods allow users to pay with tokens other than USDC. The contract handles the swap to USDC internally.

> **Non-Odyssey chains** use the 1inch aggregator. **Odyssey chains** use a native ETH swap path.

#### Fetching Swap Quote

Fetch swap data from the Zebec backend before calling swap methods:

```ts
const urlParams = new URLSearchParams({
	src, // source token address
	dst, // destination token address (USDC)
	from, // user wallet address
	origin, // user wallet address
	amount, // amount in source token smallest unit
	slippage: "5",
	compatibility: "true",
	chainId: chainId.toString(),
	receiver, // ZebecCard contract address
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

#### `swapAndBuyCardDirectV2`

Swaps a source token to USDC and buys a card using a backend-signed swap fee (v2). **Non-Odyssey chains only.**

The backend provides an EIP-712 signature over the swap fee amount to prevent fee manipulation. The signature is verified on-chain before processing the swap and card purchase.

```ts
const approval = await service.approve({
	token: srcTokenAddress,
	spender: await service.zebecCard.getAddress(),
	amount: srcAmount,
});
if (approval) await approval.wait();

const tx = await service.swapAndBuyCardDirectV2({
	swapData: { swapParams, ether },
	cardType: "carbon",
	buyerEmail: "user@example.com",
	signatureData: {
		feeAmount: "0.25", // USDC swap fee (human-readable)
		signature: "0x...", // EIP-712 signature from backend
	},
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
	ether: "0.1", // Amount of native ETH (in ETH units)
	slippage: 1, // Slippage tolerance in percent
});
const receipt = await tx.wait();
console.log("txhash:", receipt?.hash);
```

---

### Partner Flow (Non-Odyssey only)

These methods allow purchasing cards through a registered partner. Partner configs, fee tiers, and token fees are set by the contract admin.

#### `buyCardDirectForPartner`

Buys a card directly with USDC for a partner. The partner must be enabled and the amount must be within the partner's configured range.

```ts
const tx = await service.buyCardDirectForPartner({
	partnerId: ethers.id("partner-name"),
	amount: "50",
	cardType: "silver",
	buyerEmail: "user@example.com",
});
await tx.wait();
```

#### `swapAndBuyForPartner`

Swaps a source token to USDC and buys a card directly for a partner.

```ts
const tx = await service.swapAndBuyForPartner({
	partnerId: ethers.id("partner-name"),
	swapData: { swapParams, ether },
	cardType: "carbon",
	buyerEmail: "user@example.com",
});
await tx.wait();
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
	totalCardPurchased: string; // Total USDC value purchased today
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
const minUsdc = await service.getMinimumUsdcAmount("0.1", 1);
console.log("min USDC:", minUsdc);
```

#### `getPartnerConfig`

Returns the partner configuration for a given partner ID. **Non-Odyssey chains only.**

```ts
const config = await service.getPartnerConfig({ partnerId: ethers.id("partner-name") });
console.log(config);
```

Returns a `PartnerConfig` object:

```ts
{
	enabled: boolean;
	defaultFeePercent: string;
	cardVault: string;
	revenueVault: string;
	reloadableFeePercent: string;
	minCardAmount: string;
	maxCardAmount: string;
}
```

#### `getPartnerFee`

Returns the partner fee for a given purchase amount. **Non-Odyssey chains only.**

```ts
const fee = await service.getPartnerFee({
	partnerId: ethers.id("partner-name"),
	amount: "100",
});
console.log("partner fee:", fee);
```

#### `getPartnerFeeTiers`

Returns configured fee tiers for a partner. **Non-Odyssey chains only.**

```ts
const tiers = await service.getPartnerFeeTiers({ partnerId: ethers.id("partner-name") });
// [{ feePercent: "1.5", minAmount: "0", maxAmount: "500" }, ...]
```

#### `getPartnerTokenFee`

Returns the custom token fee for a partner. **Non-Odyssey chains only.**

```ts
const fee = await service.getPartnerTokenFee({
	partnerId: ethers.id("partner-name"),
	tokenAddress: "0x...",
});
console.log("partner token fee:", fee);
```

#### `getUserNonce`

Returns the current v2 nonce for a user. The backend needs this nonce to produce a valid EIP-712 signature for v2 transactions. **Non-Odyssey chains only.**

```ts
const nonce = await service.getUserNonce({ userAddress: signerAddress });
console.log("nonce:", nonce);
```

#### `getV2Admin`

Returns the admin address used for v2 signature verification. **Non-Odyssey chains only.**

```ts
const v2Admin = await service.getV2Admin();
console.log("v2 admin:", v2Admin);
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
await (
	await service.setFeeTiers({
		feeTiers: [
			{ feePercent: "1.0", minAmount: "0", maxAmount: "200" },
			{ feePercent: "1.5", minAmount: "200", maxAmount: "500" },
			{ feePercent: "2.0", minAmount: "500", maxAmount: "9999" },
		],
	})
).wait();
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

#### `setPartnerConfig` (Non-Odyssey chains only)

Sets the configuration for a partner.

```ts
await (
	await service.setPartnerConfig({
		partnerId: ethers.id("partner-name"),
		config: {
			enabled: true,
			defaultFeePercent: "1.5",
			cardVault: "0x...",
			revenueVault: "0x...",
			reloadableFeePercent: "1.0",
			minCardAmount: "10",
			maxCardAmount: "1000",
		},
	})
).wait();
```

#### `setPartnerEnabled` (Non-Odyssey chains only)

Enables or disables a partner.

```ts
await (
	await service.setPartnerEnabled({
		partnerId: ethers.id("partner-name"),
		enabled: true,
	})
).wait();
```

#### `setPartnerFeeTiers` (Non-Odyssey chains only)

Replaces all fee tiers for a partner.

```ts
await (
	await service.setPartnerFeeTiers({
		partnerId: ethers.id("partner-name"),
		feeTiers: [
			{ feePercent: "1.0", minAmount: "0", maxAmount: "200" },
			{ feePercent: "1.5", minAmount: "200", maxAmount: "500" },
		],
	})
).wait();
```

#### `setPartnerTokenFee` (Non-Odyssey chains only)

Sets a custom token fee percentage for a partner.

```ts
await (
	await service.setPartnerTokenFee({
		partnerId: ethers.id("partner-name"),
		tokenAddress: "0x...",
		fee: "3.0",
	})
).wait();
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
	PartnerConfig,
	FeeTier,
	CardPurchaseOfDay,
	SwapData,
	SwapAndBuyCardParams,
	SwapAndBuyCardParamsForPartner,
	SwapAndBuyCardParamsOdyssey,
	CardV2SignatureData,
	SwapAndBuyCardParamsV2,
} from "@zebec-network/evm-card-sdk";
```

| Type                             | Description                                      |
| -------------------------------- | ------------------------------------------------ |
| `CardType`                       | `"silver" \| "carbon"`                           |
| `CardConfig`                     | Full contract configuration object               |
| `PartnerConfig`                  | Partner-specific card purchase configuration     |
| `FeeTier`                        | `{ feePercent, minAmount, maxAmount }`           |
| `CardPurchaseOfDay`              | `{ totalCardPurchased, cardPurchasedTimestamp }` |
| `SwapData`                       | Swap quote data from the Zebec backend           |
| `SwapAndBuyCardParams`           | Parameters for `swapAndBuyCardDirect`            |
| `SwapAndBuyCardParamsForPartner` | Parameters for `swapAndBuyForPartner`            |
| `SwapAndBuyCardParamsOdyssey`    | Parameters for `swapAndBuyCardOdyssey`           |
| `CardV2SignatureData`            | Backend-signed EIP-712 fee data for v2 methods   |
| `SwapAndBuyCardParamsV2`         | Parameters for `swapAndBuyCardDirectV2`          |
