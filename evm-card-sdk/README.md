# EVM Zebec Card Sdk

An sdk for interacting with zebec instant card evm contract.

## Installation

Install package using yarn or npm

```
yarn add zic-evm-sdk

npm install zic-evm-sdk
```

## Usage

### Create Service Instance

To use this sdk you should first create a `ZebecCardService` instance. To create an instance you need signer and chainId.
Supported chains are Sepolia, Mainnet (Ethereum), BSC, Base, BscTestnet

```ts
const signer = <ethers.Signer Instance> // most wallet provider have way to create signer
const chainId = ODYSSEY_TESTNET_CHAIN_ID;

const service = new ZebecCardService(signer, chainId);
```

### Deposit Usdc

To deposit you first need to approve the zebec card contract to make use to amount to be deposited. Then you can perform deposit action.

```ts
const amount = "1000";
const token = await service.usdcToken.getAddress();
const spender = await service.zebecCard.getAddress();
const approval = await service.approve({
	amount,
	spender,
	token,
});

if (approval) {
	const receipt0 = await approval.wait();
	console.log("approval hash:", receipt0?.hash);
}

const response = await service.depositUsdc({ amount });
const receipt1 = await response.wait();
console.log("txhash:", receipt1?.hash);
```

### Withdraw Usdc

Withdraw can performed by call withdraw method in service.

```ts
const response = await service.withdraw({ amount: "10" });
const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Fetch user deposit balance

```ts
const cardBalance = await service.getUserBalance({ userAddress: signer });
console.log("card balance:", cardBalance0);
```

### Fetch swap data

To fetch swap data. You can fetch swap data by calling `api.card.zebec.io/swap/get1inchswapquotes?<params>`.

```ts
const brett = "0x532f27101965dd16442E59d40670FaF5eBB142E4";
const amount = "1";
const dstToken = await service.usdcToken.getAddress();

const urlParams = new URLSearchParams({
	src,
	dst,
	from,
	origin,
	amount,
	slippage: slippage.toString(),
	compatibility: "true",
	chainId: chainId.toString(),
	receiver,
	disableEstimate: "true",
});

//api.card.zebec.io/swap/get1inchswapquotes?src=0x9Cf0ED013e67DB12cA3AF8e7506fE401aA14dAd6&dst=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&from=0xCDdb8c03E3B2D04A52771E77B1FAD9daA8a38744&origin=0xCDdb8c03E3B2D04A52771E77B1FAD9daA8a38744&amount=1&slippage=5&compatibility=true&chainId=1&receiver=0xCDdb8c03E3B2D04A52771E77B1FAD9daA8a38744&disableEstimate=true

const url = BASE_BACKEND_API_URL + `/swap/get1inchswapquotes?${urlParams}`;
console.log("url:", url);

const swapData = await(
	await fetch(url, {
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json; charset=utf-8",
		},
	}),
).json();
```

### Swap And Deposit

Swap and deposit is supposed to be performed when user has to deposit token other than usdc. The contract takes certain amount of USDC as fee for providing swap feature. It can done by calling `swapAndDeposit` method in service. The same data obtained by calling `fetchSwapData` can passed to that method. Before depositing user's token, you are required to approve the ZebecCard contract to spend the token because, token is first transferred to ZebecCard contract being swapped to USDC.

```ts
const swapAndData = ...

const approval = await service.approve({
    token: brett,
    amount,
    spender: service.zebecCard,
});

if (approval) {
    const receipt = await approval.wait();
    console.log("approval hash:", receipt?.hash);
}

const response = await service.swapAndDeposit(data);
const receipt1 = await response.wait();
console.log("txhash:", receipt1?.hash);
```

### Buy card

Card purchase consume user's usdc deposits. To buy card you have to call `buyCard` method in service.

```ts
const response = await service.buyCard({
	amount: "199",
	cardTypeId: "103108509702",
	buyerEmail: "user@gmail.com",
});

const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Get total amount of card purchased in a day last time

```ts
const userAddress = "<address>";
const cardPurchase = await service.getCardPurhcaseOfDay({ userAddress });
console.log("card purchase:", cardPurchase);
```

### Direct Buy Direct

```ts
const amount = "1000";
console.log("amount: ", amount);
const token = await service.usdcToken.getAddress();
const spender = await service.zebecCard.getAddress();

const approval = await service.approve({
	amount,
	spender,
	token,
});

console.log("approval:", approval);

if (approval) {
	const receipt0 = await approval.wait();
	console.log("approval hash:", receipt0?.hash);
}

const response = await service.buyCardDirect({
	amount,
	cardTypeId: "103108509702",
	buyerEmail: "user@gmail.com",
});

const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Fetch swap quote

```ts
const urlParams = new URLSearchParams({
	src,
	dst,
	from,
	origin,
	amount,
	slippage: slippage.toString(),
	compatibility: "true",
	chainId: chainId.toString(),
	receiver,
	disableEstimate: "true",
});

const url = BASE_BACKEND_API_URL + `/swap/get1inchswapquotes?${urlParams}`;
console.log("url:", url);

const response = await(
	await fetch(url, {
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json; charset=utf-8",
		},
	}),
).json();

return response;
```

### Swap And Direct Buy Card

```ts
const brett = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const amount = "1";
const spender = await service.zebecCard.getAddress();

const approval1 = await service.approve({
	amount,
	spender,
	token: brett,
});

if (approval1) {
	const receipt1 = await approval1.wait();
	console.log("approval hash:", receipt1?.hash);
}

const response = await service.swapAndBuyCardDirect({
	...data,
	cardTypeId: "103108509702",
	buyerEmail: "user@gmail.com",
});
const receipt2 = await response.wait();
console.log("swap and buycard hash:", receipt2?.hash);
```

> Note: Swap and buycard direct works in all supported chain expected odyssey.

### Swap and Buy Card Directly in Odyssey Chain

```ts
const buyerEmail = "shrestharoshan768@gmail.com";
const swapAmount = "1265";
console.log("signer: ", signer.address);
const swapAndBuyParams: SwapAndBuyCardParamsOdyssey = {
	cardTypeId: "103251238082",
	buyerEmail,
	ether: swapAmount,
	slippage: 1,
};

const response = await service.swapAndBuyCardOdyssey(swapAndBuyParams);
const receipt = await response.wait();
console.log("hash: ", receipt?.hash);
```

### Generate Yield

To transfer usdc from user's vault to yield provider, user has to call the generateYield method. After the trasaction success, user will receive equivalent aUSDC token of respective chain. This token will increase gradually as time passes and is required to withdraw yield.

```ts
const amount = "100";
const response = await service.generateYield({ amount });
const receipt1 = await response.wait();
console.log("txhash:", receipt1?.hash);
```

### Withdraw Yield

To withdraw yield user has to first give allowance the zebec contract to spend the aUSDC token. After approval is given, the withdraw methods can called.

```ts
const spender = await service.zebecCard.getAddress();
const token = getATokenAddress(SEPOLIA_CHAIN_ID);
const amount = "100";

const approval = await service.approve({
	token,
	amount,
	spender,
});

if (approval) {
	const receipt0 = await approval.wait();
	console.log("approval hash:", receipt0?.hash);
}

const response = await service.withdrawYield({ amount });
const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Wrap Native Currency

```ts
const amount = "0.001";
const response = await service.wrapEth({ amount });
const receipt = await response.wait();
console.log("txHash:", receipt?.hash);
```

### Admin functionality

To call admin functions you need to create instance of `ZebecCardService` with admin signer. View functions call be called regardless of any signer but write functions are authorized to call by only admin.

### Get Card Config

```ts
const cardConfig: CardConfig = await service.getCardConfig();
console.log("cardConfig:", cardConfig);
```

### Get Admin Address

```ts
const admin: string = await service.getAdmin();
console.log("admin:", admin);
```

### Set Native Fee

```ts
const response = await service.setNativeFee({ feeInPercent: "1.5" });
const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Set NonNative Fee

```ts
const response = await service.setNonNativeFee({ feeInPercent: "2.5" });
const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Set Revenue Fee

```ts
const response = await service.setRevenueFee({ feeInPercent: "5.0" });
const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Set Revenue Vault

```ts
const vaultAddress = "<address>";
const response = await service.setRevenueVault({ vaultAddress });
const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Set Commission Vault

```ts
const vaultAddress = "<address>";
const response = await service.setCommissionVault({ vaultAddress });
const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

### Set Card Vault

```ts
const vaultAddress = "<address>";
const response = await service.setCardVault({ vaultAddress });
const receipt = await response.wait();
console.log("txhash:", receipt?.hash);
```

###

Fetc

### Creating Token Contract Instance

The SDK export Token contract factory as well. You can create token contract object in following way.

```ts
const tokenAddress = "<token adddress>";
const signer = <ethers.Signer Instance>;
const token = Token__factory.connect(tokenAddress, signer);
```

You can use this object to interact with ERC20 Token contracts. For example, fetching token balance of user would be like:

```ts
const walletAddress = "<address>";
const balance = await token.balanceOf(walletAddress);
```

### Parsing events from logs

The sdk provides ZebecCard contract factory which can be used to create ethers interface for parsing events from logs.

```ts
function parseLogs(logs: readonly Log[]) {
	const zebecCardInterface = ZebecCard__factory.createInterface();
	return logs.map((l) => zebecCardInterface.parseLog(l)).filter(Boolean) as LogDescription[];
}
```

You can create function that parse receipt logs to LogDescription

```ts

```

### Parsing deposit event

```ts
const url = "<RPC URL>";
const provider = new ethers.JsonRpcProvider(url);

const hash = "0x787b49fe1d8896ab53ebe0b39828aa7f50d5c8c33521ca75bbcf071cec8306cb";
const receipt = await provider.getTransactionReceipt(hash);
assert(receipt, "Could not find receipt.");
const zebecCardEvents = parseLogs(receipt.logs);
const depositedEvent = zebecCardEvents.find((e) => e.name === "Deposited");
assert(depositedEvent, "Could not find Deposited event");

depositedEvent.args.map((arg, i) => console.log("arg %d: %o", i, arg));
```

### Parsing withdraw event

```ts
const hash = "0x8b3dd458428323f60ce53cdfed5412d5228f020082881e2434381259b607fe75";
const receipt = await provider.getTransactionReceipt(hash);
assert(receipt, "Could not find receipt.");
const zebecCardEvents = parseLogs(receipt.logs);
const withdrawnEvent = zebecCardEvents.find((e) => e.name === "Withdrawn");
assert(withdrawnEvent, "Could not find Withdrawn event");

withdrawnEvent.args.map((arg, i) => console.log("arg %d: %o", i, arg));
```

### Parsing card purchase event

```ts
const hash = "0xf81179e1a79293b2e7ee012a57b03a093cc33f647bdc3c20be9c63b97557c392";
const receipt = await provider.getTransactionReceipt(hash);
assert(receipt, "Could not find receipt.");
const zebecCardEvents = parseLogs(receipt.logs);
const cardPurchasedEvent = zebecCardEvents.find((e) => e.name === "CardPurchased");
assert(cardPurchasedEvent, "Could not find CardPurchased event");

cardPurchasedEvent.args.map((arg, i) => console.log("arg %d: %o", i, arg));
```

### Parsing swap and deposit event

```ts
const hash = "";
const receipt = await provider.getTransactionReceipt(hash);
assert(receipt, "Could not find receipt.");
const zebecCardEvents = parseLogs(receipt.logs);
const swappedEvent = zebecCardEvents.find((e) => e.name === "Swapped");
assert(swappedEvent, "Could not find Swapped event");

swappedEvent.args.map((arg, i) => console.log("arg %d: %o", i, arg));
```
