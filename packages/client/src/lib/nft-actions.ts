import { baseSepolia } from 'viem/chains';
import { createPublicClient, http, type PublicClient, type Hex, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mint as zoraMint } from '@zoralabs/protocol-sdk';

// WARNING: This approach is NOT secure for production. Never expose private keys in client-side code in a real app.
// This is only for local development or sandbox environments.

// Load the minter private key from environment variable
const MINTER_PRIVATE_KEY = import.meta.env.VITE_NFT_MINTER_PRIVATE_KEY as Hex;
if (!MINTER_PRIVATE_KEY) {
  throw new Error('VITE_NFT_MINTER_PRIVATE_KEY is not set in environment variables!');
}

export const ZORA_CONTRACT_ADDRESS = '0x1560aEc2263d8979F24Aa0a260bF11f55E458473' as const;
const CHAIN = baseSepolia;
export const IDEA_NFT_ID = 1n;
export const VISION_NFT_ID = 1n; // <<< ASSUMING VISION IS TOKEN ID 2 >>>

// Helper Public Client (explicitly typed)
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

// Create the minter account and wallet client
const minterAccount = privateKeyToAccount(MINTER_PRIVATE_KEY);
const walletClient = createWalletClient({
  account: minterAccount,
  chain: CHAIN,
  transport: http(),
});

/**
 * Mints an NFT directly to the user wallet using the minter wallet and Zora SDK.
 *
 * @param toAddress The recipient's address (user's wallet).
 * @param tokenId The ID of the 1155 token to mint.
 * @param quantity The quantity to mint (default 1).
 * @param comment Optional comment for the mint transaction.
 * @returns The transaction hash.
 * @throws If transaction fails.
 */
export async function mintNftToUser(
  toAddress: Hex,
  tokenId: bigint,
  quantity: number = 1,
  comment?: string
): Promise<Hex> {
  // Prepare the mint transaction using the Zora SDK
  const { parameters } = await zoraMint({
    tokenContract: ZORA_CONTRACT_ADDRESS,
    mintType: '1155',
    tokenId,
    quantityToMint: quantity,
    minterAccount: minterAccount,
    mintRecipient: toAddress,
    publicClient,
  });

  // Send the mint transaction
  const hash = await walletClient.writeContract(parameters);
  return hash as Hex;
}

// Remove all minting logic and exports
