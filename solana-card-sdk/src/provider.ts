import { Address, AnchorProvider, translateAddress, web3 } from "@coral-xyz/anchor";

export class ReadonlyProvider {
	readonly connection: web3.Connection;
	readonly publicKey?: web3.PublicKey;

	constructor(connection: web3.Connection, walletAddress?: Address) {
		this.connection = connection;
		this.publicKey = walletAddress ? translateAddress(walletAddress) : undefined;
	}
}

export function createReadonlyProvider(
	connection: web3.Connection,
	walletAddress?: Address,
): ReadonlyProvider {
	return new ReadonlyProvider(connection, walletAddress);
}

/**
 * Wallet interface used by Anchor Framework
 */
export interface AnchorWallet {
	signTransaction: <T extends web3.Transaction | web3.VersionedTransaction>(tx: T) => Promise<T>;
	signAllTransactions: <T extends web3.Transaction | web3.VersionedTransaction>(
		txs: T[],
	) => Promise<T[]>;
	publicKey: web3.PublicKey;
}

export function createAnchorProvider(
	connection: web3.Connection,
	wallet: AnchorWallet,
	options?: web3.ConfirmOptions,
): AnchorProvider {
	return new AnchorProvider(connection, wallet, {
		...AnchorProvider.defaultOptions(),
		...options,
	});
}
