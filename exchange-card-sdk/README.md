# Zebec Exchange Card SDK

The Zebec Exchange Card SDK lets developers fund Zebec virtual cards from a variety of non-EVM and alt‑EVM chains by transferring native assets or supported tokens to a Zebec-managed deposit vault. Each chain is exposed through a dedicated service that wraps vault discovery, balance checks, and transaction submission.

Supported networks:

- Aleo (native credits, USAD/USDCX stablecoins, public & private transfers)
- Algorand (ALGO and ASA tokens, e.g. USDC)
- Boba Network (Mainnet / Sepolia testnet — ETH and ERC‑20)
- NEAR (NEAR and NEP‑141 fungible tokens)
- Octa Space (OCTA native transfers)
- Quai Network (QUAI native transfers)
- Stellar (XLM and USDC)
- XDB Chain (XDB native transfers)
- XRPL / Ripple (XRP and issued tokens, with trust line setup)

Every service can be toggled between mainnet (production) and testnet via the `sandbox` flag.

---

## Installation

```bash
npm i @zebec-network/exchange-card-sdk
```

Peer/runtime dependencies you may need depending on which service you use: `ethers`, `algosdk`, `xrpl`, `quais`, `@near-js/*`, `@provablehq/sdk`, `@zebec-fintech/stellar-sdk`.

## Common Concepts

### Sandbox mode

Every service constructor accepts an options bag with a `sandbox` boolean. When `sandbox: true`, the service:

- Talks to the Zebec sandbox API at `https://dev-super.api.zebec.io`.
- Uses the testnet RPC for its chain (e.g. Sepolia for Boba, Testnet for Algorand/Stellar/XRPL, Futurenet for XDB, etc.).

Defaults to `false` (production) when omitted.

### Vault address

Each service exposes `fetchVault(symbol?)` which calls Zebec's API to retrieve the destination deposit address (and optional memo `tag`) for a given asset symbol. All `transfer*` methods call `fetchVault` internally with the appropriate symbol — you generally do not need to call it yourself.

### API health check

The underlying `ZebecCardAPIService` exposes `ping()` which calls `/health` on the card API and returns `true` if reachable, otherwise throws.

---

## Quick Start

Pick the service that matches your source chain. Each service takes a wallet/signer and an optional `{ sandbox }` config.

### Boba Network (EVM)

```typescript
import { ethers } from "ethers";
import { BobaService } from "@zebec-network/exchange-card-sdk";

const provider = new ethers.JsonRpcProvider("https://sepolia.boba.network");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const boba = new BobaService(signer, { sandbox: true });

// Native ETH on Boba
await boba.transferBobaEth({ amount: "0.01" });

// ERC‑20 token on Boba
await boba.transferToken({
    amount: "10",
    symbol: "BOBA-USDC",
    tokenAddress: "0x...",
});
```

### Octa Space (EVM)

```typescript
import { ethers } from "ethers";
import { OctaService } from "@zebec-network/exchange-card-sdk";

const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const octa = new OctaService(signer, { sandbox: false });

await octa.transferOcta({ amount: "1.5" });
```

### Quai Network

```typescript
import { QuaiService, QuaiWallet } from "@zebec-network/exchange-card-sdk";

const wallet: QuaiWallet = {
    address: "0x...",
    signAndSendTransaction: async (tx) => {
        /* sign & submit */
        return "0xhash";
    },
};

const quai = new QuaiService(wallet, { sandbox: false });
const txHash = await quai.transferQuai({ amount: "2.0" });
```

### NEAR

```typescript
import { NearService, NearWallet } from "@zebec-network/exchange-card-sdk";

const wallet: NearWallet = {
    signerId: "alice.near",
    signAndSendTransaction: async (transaction) => {
        /* submit via near-api-js or wallet selector */
    },
};

const near = new NearService(wallet, { sandbox: false });

// Native NEAR
await near.transferNear({ amount: "1.25" });

// NEP‑141 token (e.g. USDC)
await near.transferTokens({
    amount: "10",
    tokenContractId: "usdc.fakes.testnet",
});
```

`registerAccountInTokenContract({ tokenContractId })` is also available; `transferTokens` already invokes the same `storage_deposit` flow internally when the destination is not yet registered.

### XRPL (Ripple)

```typescript
import { XRPLService, XRPLWallet } from "@zebec-network/exchange-card-sdk";

const wallet: XRPLWallet = {
    address: "r...",
    signTransaction: async (tx) => {
        /* sign with xrpl.js Wallet or a wallet extension */
    },
};

const xrpl = new XRPLService(wallet, { sandbox: true });

// Native XRP
await xrpl.transferXRP({ amount: "5" });

// Issued token (requires a trust line)
await xrpl.createTrustLine({
    amount: "1000000",
    token: { currency: "USD", issuer: "rIssuer..." },
});
await xrpl.transferTokens({
    amount: "10",
    token: { currency: "USD", issuer: "rIssuer..." },
});
```

### Algorand

```typescript
import algosdk from "algosdk";
import { AlgorandService, AlgorandWallet } from "@zebec-network/exchange-card-sdk";

const wallet: AlgorandWallet = {
    address: "ALGO_ADDRESS",
    signAndSendTransaction: async (txn) => {
        /* sign and submit, return tx id */
    },
};

const algo = new AlgorandService(wallet, { sandbox: true });

// Native ALGO
await algo.transferAlgo({ amount: "1.0", note: "card top-up" });

// ASA (e.g. USDC asset id 31566704 on mainnet, 10458941 on testnet)
await algo.transferAsset({ assetId: 10458941, amount: "10" });
```

### Stellar

```typescript
import { StellarService, StellarWallet } from "@zebec-network/exchange-card-sdk";

const wallet: StellarWallet = {
    address: "G...",
    signTransaction: async (xdr) => {
        /* sign and return signed xdr */
    },
};

const stellar = new StellarService(wallet, { sandbox: true });

await stellar.transferXLM("5");
await stellar.transferUSDC("10");
```

`transferXLM` attaches the vault's `tag` as a `Memo.id` automatically. The USDC issuer is preconfigured for both mainnet and testnet (see `STELLAR_USDC_ISSUER`).

### XDB Chain

```typescript
import { XDBService, XDBWalletInterface } from "@zebec-network/exchange-card-sdk";

const wallet: XDBWalletInterface = {
    address: "G...",
    signTransaction: async (xdr) => {
        /* sign and return signed xdr */
    },
};

const xdb = new XDBService(wallet, { sandbox: false });
await xdb.transferXDB("100");
```

### Aleo

```typescript
import { AleoService, AleoWallet } from "@zebec-network/exchange-card-sdk";

const wallet: AleoWallet = {
    address: "aleo1...",
    decrypt: async (ciphertext) => {
        /* decrypt record ciphertext */
    },
    requestRecords: async (program, includePlaintext) => {
        /* fetch records from wallet */
    },
    executeTransaction: async (opts) => {
        /* execute program tx */
    },
};

const aleo = new AleoService(wallet, undefined, { sandbox: false });

// Native credits — public or private
await aleo.transferCredit({ amount: "1.5", transferType: "public" });

// Stablecoin (USAD / USDCX) — supports public and compliant private transfers
await aleo.transferStableCoin({
    programId: "usad_stablecoin.aleo",
    amount: "10",
    transferType: "private",
});
```

For private stablecoin transfers, `AleoService` automatically:

1. Fetches an unspent record with sufficient balance for the program.
2. Builds a Sealance Merkle exclusion proof against the program's freeze list (`NETWORK_CONFIG[network].freezeListApi`) to prove the sender is not blocklisted.

Balance helpers: `getPublicBalance()`, `getPrivateBalance()`, `getPublicTokenBalance(programId, symbol)`, `getPrivateTokenBalance(programId, symbol)`.

---

## Service Reference

| Service           | Native transfer     | Token transfer                       | Notes                                         |
| ----------------- | ------------------- | ------------------------------------ | --------------------------------------------- |
| `BobaService`     | `transferBobaEth`   | `transferToken`                      | Boba Mainnet (288) / Sepolia testnet (28882)  |
| `OctaService`     | `transferOcta`      | —                                    | Hard-coded chainId `800001`                   |
| `QuaiService`     | `transferQuai`      | —                                    | Mainnet (9) / Testnet (15000)                 |
| `NearService`     | `transferNear`      | `transferTokens`                     | Auto `storage_deposit` for NEP‑141            |
| `XRPLService`     | `transferXRP`       | `transferTokens` + `createTrustLine` | Memo / destination tag handled automatically  |
| `AlgorandService` | `transferAlgo`      | `transferAsset`                      | Validates ASA opt-in on recipient             |
| `StellarService`  | `transferXLM`       | `transferUSDC`                       | Submission retries with exponential backoff   |
| `XDBService`      | `transferXDB`       | —                                    | LiveNet / Futurenet network passphrases       |
| `AleoService`     | `transferCredit`    | `transferStableCoin`                 | Public + private with compliance proof        |

### Utilities

The SDK re-exports helpers from `utils`:

- `parseAlgo` / `formatAlgo` — ALGO ↔ microAlgo conversion
- `parseAlgorandAsset` / `formatAlgorandAsset` — ASA base-unit conversion
- `getAssetDecimals(client, assetId)` — cached ASA decimals lookup
- `toMicroUnits` / `fromMicroUnits` — generic decimal conversion (used by Aleo)
- `getTokenBySymbol(symbol, network)` — fetch Aleo token metadata from `api.provable.com`

And from `constants`:

- `CARD_API_URL` — Production / Sandbox base URLs
- `NEAR_RPC_URL`, `XRPL_RPC_URL`, `STELLAR_RPC_URL`, `XDB_RPC_URL`, `ALGORAND_RPC_URL`
- `STELLAR_USDC_ISSUER`, `BITCOIN_ENDPOINTS`, `ALEO_NETWORK_CLIENT_URL`
- `BOBA_CHAIN_ID`, `QUAI_CHAIN_ID`, `XDB_NETWORK`
- Default EVM/Quai gas constants, `PLATFORM_FEE`

### Raw API client

If you need direct access to the Zebec card API:

```typescript
import { ZebecCardAPIService } from "@zebec-network/exchange-card-sdk";

const api = new ZebecCardAPIService(true); // sandbox
await api.ping();
const vault = await api.fetchVault("XRP");
```
