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

// Zora NFT Configuration (for Idea and Vision NFTs)
export const ZORA_CONTRACT_ADDRESS = '0x1560aEc2263d8979F24Aa0a260bF11f55E458473' as const;
export const IDEA_NFT_ID = 1n;
export const VISION_NFT_ID = 2n;

const CHAIN = baseSepolia;

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
 * Used for Idea and Vision NFTs.
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

/**
 * Submits a POL (Proof of Learning) proof to the Molecule POI contract
 * Uses the contract address and payload from the POI API response
 *
 * @param contractAddress The contract address from POI API response (transaction.recipient)
 * @param proofPayload The proof payload from POI API response (transaction.payload)
 * @param userWalletAddress The user's wallet address for the transaction
 * @returns The transaction hash
 */
export async function submitPOLProof(
  contractAddress: Hex,
  proofPayload: Hex,
  userWalletAddress: Hex
): Promise<Hex> {
  try {
    // Submit the proof transaction using the user's wallet (not the minter wallet)
    // This creates a permanent on-chain record of the learning proof
    const hash = await walletClient.sendTransaction({
      account: userWalletAddress,
      to: contractAddress,
      data: proofPayload,
      value: 0n,
    });

    return hash as Hex;
  } catch (error) {
    console.error('POL proof submission failed:', error);
    throw new Error(
      `Failed to submit POL proof: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Creates a commemorative POL NFT using the Zora contract
 * This is separate from the proof submission and serves as a learning achievement badge
 *
 * @param toAddress The recipient's address (user's wallet).
 * @param merkleRoot The merkle root from POI proof for verification.
 * @param quantity The quantity to mint (default 1).
 * @returns The transaction hash.
 * @throws If transaction fails.
 */
export async function mintPOLNFT(
  toAddress: Hex,
  merkleRoot: Hex,
  quantity: number = 1
): Promise<Hex> {
  try {
    // Create a comment that includes the merkle root for verification
    const comment = `POL NFT - Proof of Learning with merkle root: ${merkleRoot}`;

    // Use a new token ID for POL NFTs (ID 3)
    const POL_NFT_ID = 3n;

    // Use the existing Zora minting system
    const hash = await mintNftToUser(toAddress, POL_NFT_ID, quantity, comment);

    return hash;
  } catch (error) {
    console.error('POL NFT minting failed:', error);
    throw new Error(
      `Failed to mint POL NFT: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Creates a comment string for POL NFT minting (for logging/display purposes)
 *
 * @param polData The POL result data from the API
 * @param poiTransactionHash The POI blockchain transaction hash
 * @returns Comment string for display
 */
export function createPOLComment(
  polData: { merkleRoot: string; files: Array<{ filename: string; size: number }> },
  poiTransactionHash?: string
): string {
  const fileCount = polData.files.length;
  const merkleShort = polData.merkleRoot.substring(0, 10) + '...';
  const poiTxShort = poiTransactionHash ? poiTransactionHash.substring(0, 10) + '...' : 'pending';

  return `POL NFT - Files: ${fileCount} | Merkle: ${merkleShort} | POI Tx: ${poiTxShort}`;
}
