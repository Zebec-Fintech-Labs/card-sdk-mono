import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import { describe, it } from "mocha";

import { BN, BorshCoder, utils, web3 } from "@coral-xyz/anchor";

import { bpsToPercent, USDC_DECIMALS, ZEBEC_CARD_IDL } from "../../../src";

const eventStructure = {
	name: "SwapEvent",
	fields: [
		{
			name: "amm",
			type: "publicKey",
			index: false,
		},
		{
			name: "inputMint",
			type: "publicKey",
			index: false,
		},
		{
			name: "inputAmount",
			type: "u64",
			index: false,
		},
		{
			name: "outputMint",
			type: "publicKey",
			index: false,
		},
		{
			name: "outputAmount",
			type: "u64",
			index: false,
		},
	],
};

dotenv.config();

describe("decode event data", () => {
	it("should run", async () => {
		const eventData =
			"QMqFu4fYGGeUEysFnenhAvD866YwW6jMndC6NeFLmgrgSsQrYzqQkLQZLriiyYAHU47xKZ9Dcp6oHcAMxjdC9NFJecmNYi1Ua1ZLQMxJVTMdjBD3cxmBfDiPi7rKoWqsze7ZywqQbGd2sr7JbrnD4xNxzBjg6Feg2Jdr2FTvT5oVXgs";

		// SwapEvent(publicKey,publicKey,u64,publicKey,u64)

		const eventBuffer = utils.bytes.bs58.decode(eventData);

		let start = 16;
		let end = 16 + 32;
		const amm = new web3.PublicKey(eventBuffer.subarray(start, end));
		console.log("amm:", amm.toString());

		start = end;
		end = start + 32;
		const inputMint = new web3.PublicKey(eventBuffer.subarray(start, end));
		console.log("inputMint:", inputMint.toString());

		start = end;
		end = start + 8;
		const inputAmount = new BN(eventBuffer.subarray(start, end));
		console.log("inputAmount:", inputAmount.toString());

		start = end;
		end = start + 32;
		const outputMint = new web3.PublicKey(eventBuffer.subarray(start, end));
		console.log("outputMint:", outputMint.toString());

		start = end;
		end = start + 8;
		const outputAmount = new BN(eventBuffer.subarray(start, end));
		console.log("outputAmount:", outputAmount.toString());
	});

	it("decode ix data:", async () => {
		const coder = new BorshCoder(ZEBEC_CARD_IDL);
		const ix = coder.instruction.decode(
			"f9c0b536b5fc67429600000000000000f401000000000000fa0000000000000067929f14aeebd008c7d4aaffdc47ffb662c8f8408edc97670d867f558c5c23fe7a55626ecca5b879573a13e72f68edd6933f622fc5cce4574a8ce8fd0660a4727a55626ecca5b879573a13e72f68edd6933f622fc5cce4574a8ce8fd0660a472404b4c00000000000065cd1d0000000000ca9a3b000000000300000040a7dc1d0000000000ca9a3b00000000320000000000000040230506000000000065cd1d000000002c01000000000000404b4c000000000000e1f505000000008a02000000000000",
			"hex",
		);

		const data = (ix?.data as any).params;
		console.log({ data });

		const UNITS_PER_USDC = BigNumber(10).pow(USDC_DECIMALS);

		console.log("ix data", {
			nativeFee: bpsToPercent(data.nativeFee.toNumber()),
			nonNativeFee: bpsToPercent(data.nonNativeFee.toNumber()),
			revenueFee: bpsToPercent(data.revenueFee.toNumber()),
			cardVault: data.cardVault.toString(),
			revenueVault: data.revenueVault.toString(),
			commissionVault: data.commissionVault.toString(),
			minCardAmount: BigNumber(data.minCardAmount.toString()).div(UNITS_PER_USDC).toFixed(),
			maxCardAmount: BigNumber(data.maxCardAmount.toString()).div(UNITS_PER_USDC).toFixed(),
			dailyCardBuyLimit: BigNumber(data.dailyCardBuyLimit.toString()).div(UNITS_PER_USDC).toFixed(),
			feeTier: data.feeTier.map((ft) => {
				const feePercent = bpsToPercent(ft.fee.toNumber());
				const minAmount = BigNumber(ft.minAmount.toString()).div(UNITS_PER_USDC).toFixed();
				const maxAmount = BigNumber(ft.maxAmount.toString()).div(UNITS_PER_USDC).toFixed();
				return {
					feePercent,
					minAmount,
					maxAmount,
				};
			}),
		});
	});

	it.only("prints pubkeys buffers", () => {
		console.log(
			new web3.PublicKey("So11111111111111111111111111111111111111112").toBuffer().toJSON(),
		);
		console.log(
			new web3.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v").toBuffer().toJSON(),
		);
	});

	it("converts base64 to base58:", async () => {
		const keys = [
			"Cn94AcK1gffmqLMpbJEtLnoLn8iG4iy7M7q/H0npg3k=",
			"CealsNC0x1MUM2AzH4YaOSznRgh0vi+NdZfOa6bjiqk=",
			"DCdogDqLFW1autr9MYaPeKo1ky6Ef4L5Cbik/fLLTu8=",
			"HelYMReyfRiur76TJ6d+mrlVTGPpVwfJYQruqskBYM0=",
			"ICYQHsIDKJZKMqurE2xUBbkfOuOO5PZMtr3oebhoONI=",
			"eFIcsXnOu4WJtVai1eyU0kmGgv35uyr1rWTkkcxBU9o=",
			"iPH/o6Lf5he9xONXMlGjIuP8roHlpFc5DmR1HACkZeI=",
			"iQd9VaW7EzB2Prdn9V7Ad7QaDQdffeHXP7rKPGPVVHE=",
			"sU4N5V6fuoY5br/VSM/4ySAR6se3W6qbLZxqhvWhcUE=",
			"vCtXBl7x3WZUML5ga6ZZbAKVMBut74ta/EEBQVD0EnQ=",
			"v5cbWRCLW4WgT7CT8eIbTj/UxMj0h90JuVdSdp8N2MM=",
			"8Yfsh9H3Rcs6AzhKJqae2gyi0aoPQeQkFjd+kf9bXTE=",
			"9/maCUL6x4gFSUOrvPlGsfm5FsvhCu3PqZZ2ZTccooA=",
			"BqoJVItQR2rUYvkfiaMBUDMmT8mr1ScAIKnRQjNHQvs=",
		];

		const parsedKeys = keys.map((key) => new web3.PublicKey(Buffer.from(key, "base64")).toString());
		console.log("keys", parsedKeys);

		const signature = utils.bytes.bs58.encode(
			Buffer.from(
				"7DtFxXIA0wdgVDiNg64+xbu8ATUPofACBLS06hYDVoxP8gRc7VI7IPQtoCwdaExOVoEP6wIXbJ/smZDY8RCjCQ==",
				"base64",
			),
		);
		console.log("signature:", signature);

		const intructionsIndexs: number[] = [];
		Buffer.from("DAMCAQULCAYJBwoEAA==", "base64").forEach((i) => intructionsIndexs.push(i));
		console.log("ix indexs", intructionsIndexs);
	});

	it("does things", async () => {
		// console.log("WSOL:", WSOL.toBuffer().toJSON())
		// console.log("ZBCN:", ZBCN.toBuffer().toJSON())

		const eventdata1 = Buffer.from(
			"e445a52e51cb9a1d40c6cde8260871e24bd949c43602c33f207790ed16a3524ca1b9975cf121a2a90cffec7df8b68acdf76bfb198bfd3d33b44cedac90e679dcd2c79e16e142ec5ece2d32df4dccd5722f3b8f0b00000000069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f000000000014e00000000000000",
			"hex",
		);
		console.log("event buffer len:", eventdata1.length);

		console.log("ix discriminator:", eventdata1.subarray(0, 8).toJSON());
		console.log("event discriminator", eventdata1.subarray(8, 16).toJSON());

		const eventdata2 = Buffer.from(
			"e445a52e51cb9a1d40c6cde8260871e204e9e12fbc84e826c932cce9e2640cce15590c1c6273b0925708ba3b8520b0bc083e1d5d64b0eb30fa1e8e03e9f2463fe2d82888846aed91540698b2fee1072b00ca9a3b00000000c6fa7af3bedbad3a3d65f36aabc97431b1bbe4c2d2f6e0e47ca60203452f5d614c140d0000000000",
			"hex",
		);
		console.log("ix discriminator:", eventdata2.subarray(0, 8).toJSON());
		console.log("event discriminator", eventdata2.subarray(8, 16).toJSON());
	});
});

const logs = `The block stream encountered a substreams fatal error and will not retry: 
rpc error: code = InvalidArgument desc = execute modules: 
applying executor results "map_silver_card_data" on block 286103079 (BzcPuZDivzwm1pT3b4WjUVd1WdBFiAjadtEVUJ78sCJT): 
execute: maps wasm call: block 286103079: module "map_silver_card_data": 
general wasm execution panicked: wasm execution failed deterministically: 
panic in the wasm: "Index out of bound: mapping ix index: 10" at src/lib.rs:93:47

----- stack trace / logs -----
log: [map_silver_card_data] tx hash: 3pGDneAHjPJa2TqK29ntFPFLAAU6vjPdguuqhTfvg3wDqTpZaVAjhuH1xzA6uRP1Nmi149hLAoDXCQXFAg6Bcmnq

log: loaded readonly addr: [EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v,
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA,
ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL,
11111111111111111111111111111111];
 loaded writeable addr len: [75UeVz3WhiGU6D6e7ZJv8FKPU3oZghL17fr8j6fLTTzs,
4McuJXo3ZinL2Jyry1suw4hovnfLaMzDUbfNoBnERhRh];

log: [map_silver_card_data] account keys: [6YFdKpTVE5wKtbeEYuuofUnqFTaqx4ETiNow6R2TPYdN,
wqDP5dbfTJgpYkvFfCdKYJL37k4Xb4xSGu95eP9kygF,
DqG6NqMshN2jGTfuLVmcd2PAfVFaY5pV99tEuuEBUKSV,
BWnnZsYwgCdhUYPG6iM3jfwBamuzetZzR1oP7Q4vDfYt,
8rtWmMQ1zfojXyRiqTCofQi6E3JatNk7Q7fYVijjnkhv,
EzrjfKfVmmMKZAeCb62996ZKLfFbSGNkZqxPwNYBsdHi,
ComputeBudget111111111111111111111111111111,
HxZq3iRwN2a2myikHz8JNVufJ7FM92xV8kNvFpQaRgKd]

log: [map_silver_card_data] mapping ix index: 0
log: [map_silver_card_data] mapping ix index: 1
log: [map_silver_card_data] mapping ix index: 10
`;
