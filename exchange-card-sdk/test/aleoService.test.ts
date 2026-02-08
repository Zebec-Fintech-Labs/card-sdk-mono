import {
    AleoNetworkClient,
    Transaction,
} from "@provablehq/sdk/mainnet.js";

import {
    ALEO_NETWORK_CLIENT_URLS,
    AleoService,
    AleoWallet,
} from "../src";
import { getAleoAccount } from "./setup";

const account = getAleoAccount();
console.log("address", account.toString())
const client = new AleoNetworkClient(ALEO_NETWORK_CLIENT_URLS.Sandbox);

const wallet: AleoWallet = {
    address: account.toString(),
    requestTransaction: async (_transaction) => {
        const result = await client.submitTransaction(Transaction.fromString(""));
        return { transactionId: result };
    }

}

const service = new AleoService(wallet, { sandbox: true });

describe("AleoService", () => {
    it("should get aleo balance", async () => {
        const balance = await service.getBalance(account.toString());
        console.log("Balance:", balance);
    });
});