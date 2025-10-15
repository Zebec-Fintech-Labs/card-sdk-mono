// import { describe, it } from "mocha";

import {
	createAnchorProvider,
	GetQuoteInfoParams,
	parseDecimalString,
	parsePercentString,
	QuoteInfo,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

const solanaMainnetTokens = [
	// {
	// 	symbol: "USDC",
	// 	name: "USDC",
	// 	decimal: 6,
	// 	mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
	// 	coingeco_id: "usd-coin",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	{
		symbol: "BONK",
		name: "BONK",
		decimal: 5,
		mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
		coingeco_id: "bonk",
		chain_id: "900",
		network: "Solana",
	},
	// {
	// 	symbol: "GUAC",
	// 	name: "Guacamole",
	// 	decimal: 5,
	// 	mint: "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
	// 	coingeco_id: "guacamole",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "SILLY",
	// 	name: "Silly Dragon",
	// 	decimal: 9,
	// 	mint: "7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs",
	// 	coingeco_id: "silly-dragon",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "BURRRD",
	// 	name: "BURRRD (BURRRD)",
	// 	decimal: 4,
	// 	mint: "F8qtcT3qnwQ24CHksuRrSELtm5k9ob8j64xAzj3JjsMs",
	// 	coingeco_id: "burrrd",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "PUFF",
	// 	name: "PUFF",
	// 	decimal: 9,
	// 	mint: "G9tt98aYSznRk7jWsfuz9FnTdokxS6Brohdo9hSmjTRB",
	// 	coingeco_id: "puff",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "ZBCN",
	// 	name: "Zebec Network",
	// 	decimal: 6,
	// 	mint: "ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU",
	// 	coingeco_id: "zebec-network",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "PONK",
	// 	name: "PONK",
	// 	decimal: 5,
	// 	mint: "HeqCcMjmuV5s25J49YiJyT6bD5qWLkP88YPajBySniaV",
	// 	coingeco_id: "ponk",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "SDOGE",
	// 	name: "SolDoge",
	// 	decimal: 5,
	// 	mint: "8ymi88q5DtmdNTn2sPRNFkvMkszMHuLJ1e3RVdWjPa3s",
	// 	coingeco_id: "soldoge",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "SPOODY",
	// 	name: "Spodermen",
	// 	decimal: 6,
	// 	mint: "8Nd3TZJfxt9yYKiPiPmYp6S5DhLftG3bwSqdW3KJwArb",
	// 	coingeco_id: "spodermen",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "HONK",
	// 	name: "HONK",
	// 	decimal: 9,
	// 	mint: "3ag1Mj9AKz9FAkCQ6gAEhpLSX8B2pUbPdkb9iBsDLZNB",
	// 	coingeco_id: "honk",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "SHIB",
	// 	name: "Shibwifhat",
	// 	decimal: 9,
	// 	mint: "F6qoefQq4iCBLoNZ34RjEqHjHkD8vtmoRSdw9Nd55J1k",
	// 	coingeco_id: "shibwifhatcoin",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "WIF",
	// 	name: "dogwifhat",
	// 	decimal: 8,
	// 	mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
	// 	coingeco_id: "dogwifcoin",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "WEN",
	// 	name: "Wen",
	// 	decimal: 5,
	// 	mint: "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
	// 	coingeco_id: "wen-4",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "MAGA",
	// 	name: "MAGA",
	// 	decimal: 8,
	// 	mint: "HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut1",
	// 	coingeco_id: "maga",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "MIM",
	// 	name: "MIM",
	// 	decimal: 9,
	// 	mint: "G33s1LiUADEBLzN5jL6ocSXqrT2wsUq9W6nZ8o4k1b4L",
	// 	coingeco_id: "magic-internet-money-meme",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "PENG",
	// 	name: "Peng",
	// 	decimal: 6,
	// 	mint: "A3eME5CetyZPBoWbRUwY3tSe25S6tb18ba9ZPbWk9eFJ",
	// 	coingeco_id: "peng",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "TIMMI",
	// 	name: "TIMMI",
	// 	decimal: 6,
	// 	mint: "BxXmDhM8sTF3QG4foaVM2v1EUvg9DLSVUsDRTjR8tMyS",
	// 	coingeco_id: "timmi",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "MUMU",
	// 	name: "Mumu the Bull",
	// 	decimal: 6,
	// 	mint: "5LafQUrVco6o7KMz42eqVEJ9LW31StPyGjeeu5sKoMtA",
	// 	coingeco_id: "mumu-the-bull-3",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "MYRO",
	// 	name: "Myro",
	// 	decimal: 9,
	// 	mint: "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
	// 	coingeco_id: "myro",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "SOLBANK",
	// 	name: "Solbank",
	// 	decimal: 9,
	// 	mint: "8twuNzMszqWeFbDErwtf4gw13E6MUS4Hsdx5mi3aqXAM",
	// 	coingeco_id: "solbank",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "CRP",
	// 	name: "CropperFinance",
	// 	decimal: 9,
	// 	mint: "DubwWZNWiNGMMeeQHPnMATNj77YZPZSAz2WVR5WjLJqz",
	// 	coingeco_id: "cropperfinance",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "ANDY",
	// 	name: "Andy",
	// 	decimal: 6,
	// 	mint: "667w6y7eH5tQucYQXfJ2KmiuGBE8HfYnqqbjLNSw7yww",
	// 	coingeco_id: "andy-on-sol",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "CHAT",
	// 	name: "Solchat",
	// 	decimal: 9,
	// 	mint: "947tEoG318GUmyjVYhraNRvWpMX7fpBTDQFBoJvSkSG3",
	// 	coingeco_id: "solchat",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "TREMP",
	// 	name: "Doland Tremp",
	// 	decimal: 9,
	// 	mint: "FU1q8vJpZNUrmqsciSjp8bAKKidGsLmouB8CBdf8TKQv",
	// 	coingeco_id: "donald-tremp",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "WOLF",
	// 	name: "Wolf",
	// 	decimal: 8,
	// 	mint: "Faf89929Ni9fbg4gmVZTca7eW6NFg877Jqn6MizT3Gvw",
	// 	coingeco_id: "the-real-landwolf",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "SOL",
	// 	name: "SOL",
	// 	decimal: 9,
	// 	mint: "So11111111111111111111111111111111111111112",
	// 	coingeco_id: "solana",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "USDY",
	// 	name: "USDY",
	// 	decimal: 6,
	// 	mint: "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6",
	// 	coingeco_id: "ondo-us-dollar-yield",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "PYUSD",
	// 	name: "PYUSD",
	// 	decimal: 6,
	// 	mint: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
	// 	coingeco_id: "paypal-usd",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
	// {
	// 	symbol: "T1500",
	// 	name: "T1500",
	// 	decimal: 6,
	// 	mint: "Avr3NYAGNuraf2uSC1Zza8nga77CELoi3trFCH2Lpump",
	// 	coingeco_id: "",
	// 	chain_id: "900",
	// 	network: "Solana",
	// },
];

describe("getQuoteInfo", () => {
	const network = "mainnet-beta";

	const connection = getConnection(network);
	const wallet = getWallets(network)[0];
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(createAnchorProvider(connection, wallet))
		.setProgram()
		.build();

	it("initialize card config and vaults", async () => {
		// const inputMintAddress = "ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU";
		// const inputMintAddress = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";
		// const inputMintAddress = "So11111111111111111111111111111111111111112";
		console.log("tokens length: ", solanaMainnetTokens.length);
		const tokens = solanaMainnetTokens.filter((t) => t.symbol.toLowerCase() != "usdc");
		const promises = tokens.map(async (token) => {
			const outputMintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // usdc
			const inputAmount = "12";
			const slippagePercent = "0.1";

			const params: GetQuoteInfoParams = {
				inputMintAddress: token.mint,
				outputMintAddress,
				inputAmount: parseDecimalString(inputAmount),
				slippagePercent: parsePercentString(slippagePercent),
				swapMode: "ExactOut",
			};

			let info: QuoteInfo = await service.getQuoteInfo(params);

			if ("error" in info) {
				info = await service.getQuoteInfo({ ...params, swapMode: "ExactIn" });
			}

			return info;
		});

		const infos = await Promise.all(promises);
		console.log("infos length:", infos.length);
		console.log(JSON.stringify(infos, null, 2));
	});
});
