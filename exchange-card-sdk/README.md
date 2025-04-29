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

```typescript
import { ethers } from 'ethers';
import { ZebecCardService, Recipient, CountryCode } from '@zebec-fintech/silver-card-sdk';

const signer: ethers.Signer = ... ; // Signer instance from Wallet Extension

const chainId = 11155111; // Sepolia testnet
const apiKey = process.env.API_KEY!;
const encryptionKey = process.env.ENCRYPTION_KEY!;

const service = new ZebecCardService(
    signer,
    chainId,
    {
        apiKey,
        encryptionKey,
    },
    {
        sandbox: true, // Set to true for development or testing
    },
);
```

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
```

### Fetch Quote

The `fetchQuote` method retrieves a quote for the specified amount in USD. The quote is used to calculate the corresponding token amount required for the card purchase. It expires in about 30 seconds.

Note: The `fetchQuote` method should be called regularly. Make sure to check it's validity before proceeding with the purchase.

#### Code Example

```typescript
const amount = "150.55"; // Amount in USD
const quote = await service.fetchQuote(amount);
```

#### Response

The `fetchQuote` method returns a quote object with the following fields:

- **id**: Unique quote identifier.
- **token**: Name or symbol of the token used to purchase the card. (e.g., `"USDC"`, `"TAO"`)
- **targetCurrency**: Currency code for the amount. (e.g., `"USD"`)
- **amountRequested**: Amount of USD the card is being purchased for.
- **pricePerUnitCurrency**: Price of the token per unit USD.
- **totalPrice**: Total token amount needed for purchase.
- **platformFee**: Any additional fees charged by the platform.
- **expiresIn**: Time in milliseconds before the quote expires.
- **timestamp**: Timestamp when the quote was generated.
- **status**: Quote status.

### Purchase Card

The `purchaseCard` method initiates a virtual card purchase. It performs four main operations:

1. Approves token spending to the ZebecCard smart contract. (ERC20 tokens only)
2. Deposits tokens into the user's Zebec vault.
3. Initiates the card purchase on-chain. (ERC20 tokens only)
4. Posts transaction data, along with metadata, to the Zebec backend.

The method returns a tuple with responses from each stage of the process.

#### Code Example

For EVM compatible networks:

```typescript
const participantId = "JohnChamling";
const firstName = "John";
const lastName = "Chamling";
const emailAddress = "user@example.com";
const mobilePhone = "+91 012345678";
const language = "en-US";
const city = "Bharatpur";
const state = "Bagmati";
const postalCode = "44200";
const countryCode: CountryCode = "NPL";
const address1 = "Shittal street, Bharatpur - 10, Chitwan";

const recipient = Recipient.create(
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
);

const amount = "150.55";
const quote = await service.fetchQuote(amount);
const [depositResponse, buyCardResponse, apiResponse] = await service.purchaseCard({
	amount,
	recipient,
	quote,
});

console.log("Deposit Transaction Hash:", depositResponse.hash);
console.log("Purchase Transaction Hash:", buyCardResponse.hash);
console.log("Zebec Server Response:", apiResponse.data);
```

For Bittensor Network:

```typescript
const participantId = "JohnChamling";
const firstName = "John";
const lastName = "Chamling";
const emailAddress = "user@example.com";
const mobilePhone = "+91 012345678";
const language = "en-US";
const city = "Bharatpur";
const state = "Bagmati";
const postalCode = "44200";
const countryCode: CountryCode = "NPL";
const address1 = "Shittal street, Bharatpur - 10, Chitwan";

const recipient = Recipient.create(
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
);

const amount = "150.55"; // Amount in USD
const quote = await service.fetchQuote(amount);
const [depositResponse, apiResponse] = await service.purchaseCard({
	walletAddress: signer.address || "<wallet_address>",
	amount,
	recipient,
	quote,
});

console.log(
	`Deposit response: \n BlockHash: ${depositResponse.blockHash} \n TransactionHash: ${depositResponse.txHash}`,
);
console.log("Zebec Server Response:", apiResponse.data);
```

---

## Configuration Parameters

### ZebecCardService

To create an instance of `ZebecCardService`, you need:

- **signer**: An instance of `ethers.Signer`.
- **chainId**: The ID of the blockchain (see list of supported chains below).
- **apiConfig**: Object containing `apiKey` and `encryptionKey`.
- **sdkConfig (optional)**: SDK-specific settings, such as:
  - `sandbox`: Boolean, set to `true` for testnets.

### ZebecCardTAOService

To create an instance of `ZebecCardTAOService`, you need:

- **signer**: An instance of `Keyring` or `Signer`.
- **apiConfig**: Object containing `apiKey` and `encryptionKey`.
- **sdkConfig (optional)**: SDK-specific settings, such as:
  - `sandbox`: Boolean, set to `true` for testnets.

### EVM Supported Chains

| Chain               | Chain ID                        |
| ------------------- | ------------------------------- |
| Ethereum            | Mainnet (1), Sepolia (11155111) |
| Binance Smart Chain | Mainnet (56), Testnet (97)      |
| Base                | Mainnet (8453)                  |

---

## Recipient Fields

To create a valid `Recipient` instance, provide the following details:

- **participantId** (alphanumeric string): Unique identifier for the buyer end user. 1-20 chars.
- **firstName**, **lastName** (string): Participant's full name.
- **emailAddress** (string): Contact email. 1-80 chars
- **mobilePhone** (string): Mobile number with country code.
- **language** (string): Language code (e.g., `"en-US"`).
- **city**, **state**, **postalCode** (string): Location details.
- **countryCode** (CountryCode enum): ISO 3166-1 alpha-3 country code.
- **address1** (string): Street address. (max 50 chars)

---

## Responses

The `purchaseCard` method returns three responses:

1. **depositResponse**: Transaction response for token deposit.
2. **buyCardResponse**: Transaction response for card purchase. (EVM only)
3. **apiResponse**: API response from Zebec's backend with additional transaction metadata.

---

## Environment Variables

- **API_KEY**: Your Zebec API Key.
- **ENCRYPTION_KEY**: Your Zebec encryption key for secure data handling.

---

## Supported Countries

| Country                          | Code |
| -------------------------------- | ---- |
| Algeria                          | DZA  |
| Angola                           | AGO  |
| Argentina                        | ARG  |
| Australia                        | AUS  |
| Austria                          | AUT  |
| Belgium                          | BEL  |
| Bolivia (Plurinational State of) | BOL  |
| Brazil                           | BRA  |
| Cameroon                         | CMR  |
| Canada                           | CAN  |
| Chile                            | CHL  |
| Costa Rica                       | CRI  |
| Cyprus                           | CYP  |
| Czechia                          | CZE  |
| Denmark                          | DNK  |
| Ecuador                          | ECU  |
| Egypt                            | EGY  |
| El Salvador                      | SLV  |
| Estonia                          | EST  |
| Finland                          | FIN  |
| France                           | FRA  |
| Georgia                          | GEO  |
| Germany                          | DEU  |
| Ghana                            | GHA  |
| Greece                           | GRC  |
| Guatemala                        | GTM  |
| Honduras                         | HND  |
| Hungary                          | HUN  |
| Iceland                          | ISL  |
| Ireland                          | IRL  |
| Italy                            | ITA  |
| Jamaica                          | JAM  |
| Japan                            | JPN  |
| Jordan                           | JOR  |
| Kenya                            | KEN  |
| Korea, Republic of Korea         | KOR  |
| Kuwait                           | KWT  |
| Lithuania                        | LTU  |
| Luxembourg                       | LUX  |
| Malawi                           | MWI  |
| Malaysia                         | MYS  |
| Malta                            | MLT  |
| Mexico                           | MEX  |
| Morocco                          | MAR  |
| Mozambique                       | MOZ  |
| Nepal                            | NPL  |
| Netherlands                      | NLD  |
| New Zealand                      | NZL  |
| Nigeria                          | NGA  |
| Norway                           | NOR  |
| Oman                             | OMN  |
| Pakistan                         | PAK  |
| Papua New Guinea                 | PNG  |
| Paraguay                         | PRY  |
| Peru                             | PER  |
| Philippines                      | PHL  |
| Poland                           | POL  |
| Portugal                         | PRT  |
| Puerto Rico                      | PRI  |
| Qatar                            | QAT  |
| Romania                          | ROU  |
| Saudi Arabia                     | SAU  |
| Singapore                        | SGP  |
| Slovakia                         | SVK  |
| Slovenia                         | SVN  |
| Spain                            | ESP  |
| Sweden                           | SWE  |
| Taiwan                           | TWN  |
| Thailand                         | THA  |
| Trinidad and Tobago              | TTO  |
| Tunisia                          | TUN  |
| Turkey                           | TUR  |
| United Kingdom                   | GBR  |
| United States                    | USA  |
| Uruguay                          | URY  |
| Vanuatu                          | VUT  |
| Zambia                           | ZMB  |
