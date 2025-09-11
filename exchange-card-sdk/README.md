# Zebec Card SDK

The Zebec Card SDK allows developers to integrate the functionality of purchasing and managing Zebec virtual cards into their applications. We currently support EVM chains (Ethereum, Binance Smart Chain (BSC), and Base) and Bittensor Network with the flexibility to toggle between mainnet and testnet environments based on configuration.

---

## Installation

Install the Zebec Card SDK via npm:

```bash
npm i @zebec-fintech/silver-card-sdk
```

## Quick Start

To get started, create an instance of `ZebecCardService` for EVM compatible networks or `ZebecCardTAOService` for Bittensor Network. This instance requires a signer, a chain ID (for EVM only), and configuration details, including API credentials.

> **Note**: Testnets (e.g., Sepolia, BSC Testnet) can only be used if `sandbox` mode is enabled.

Example:

For EVM compatible networks:

````typescript
For Bittensor Network:

```typescript
import { ZebecCardTAOService } from '@zebec-fintech/silver-card-sdk';

const signer: <Keyring | Signer> = ... ; // Keyring or Signer instance from Wallet Extension

const service = new ZebecCardTAOService(
    signer,
    {
        apiKey,
        encryptionKey,
    },
    {
        sandbox: true, // Set to true for development or testing
    },
);
````

### Fetch Quote

The `fetchQuote` method retrieves a quote for the specified amount in USD. The quote is used to calculate the corresponding token amount required for the card purchase. It expires in about 30 seconds.

Note: The `fetchQuote` method should be called regularly. Make sure to check it's validity before proceeding with the purchase.

#### Code Example

```typescript
const amount = "150.55"; // Amount in USD
const quote = await service.fetchQuote(amount);
```
