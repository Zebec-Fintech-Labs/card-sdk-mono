import { describe, it } from "mocha";

import {
	createReadonlyProvider,
	deriveUserPurchaseRecordPda,
	UserPurchaseRecordInfo,
	ZebecCardServiceBuilder,
} from "../../../src";
import { getConnection, getWallets } from "../../shared";

describe("getUserPurchaseRecordInfo", () => {
	const network = "devnet";
	const connection = getConnection(network);
	const buyerPubkey = getWallets(network)[1].publicKey;
	const provider = createReadonlyProvider(connection, buyerPubkey);
	const service = new ZebecCardServiceBuilder()
		.setNetwork(network)
		.setProvider(provider)
		.setProgram()
		.build();

	it("initialize card config and vaults", async () => {
		const buyerAddress = buyerPubkey.toString();
		console.log("buyer", buyerAddress);

		const userPurchaseRecordPda = deriveUserPurchaseRecordPda(
			buyerAddress,
			service.program.programId,
		);
		const info: UserPurchaseRecordInfo = await service.getUserPurchaseRecord(userPurchaseRecordPda);

		console.log("info", info);
	});
});
