import { AlgorandService, AlgorandWallet } from "../src";
import { getAlgorandAccount } from "./setup";

const senderAccount = getAlgorandAccount();

console.log("Sender Account:", senderAccount.addr.toString());

const algorandWallet: AlgorandWallet = {
	address: senderAccount.addr,
	signTransaction: async (txn) => {
		return txn.signTxn(senderAccount.sk);
	},
};

const service = new AlgorandService(
	algorandWallet,
	{
		apiKey: process.env.API_KEY!,
		encryptionKey: process.env.ENCRYPTION_KEY!,
	},
	{
		sandbox: true,
	},
);

describe("AlgorandService", () => {
	it("should transfer native ALGO", async () => {
		const signature = await service.transferAlgo({
			amount: 0.1,
		});
		console.log("Transfer signature:", signature);
	});

	it("should get token balance", async () => {
		const balance = await service.getAccountBalance(algorandWallet.address);
		console.log("Balance:", balance);
	});
});
