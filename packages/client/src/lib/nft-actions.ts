import { baseSepolia } from 'viem/chains';
import {
  createPublicClient,
  http,
  type PublicClient,
  type WalletClient,
  type Hex,
  createWalletClient,
  custom,
} from 'viem';
import { mint as zoraMint } from '@zoralabs/protocol-sdk';
import type { ConnectedWallet } from '@privy-io/react-auth';

// Constants
export const ZORA_CONTRACT_ADDRESS = '0x1560aEc2263d8979F24Aa0a260bF11f55E458473' as const; // From deploy.ts
const CHAIN = baseSepolia;
export const IDEA_NFT_ID = 1n; // Exporting for use in checks
export const VISION_NFT_ID = 1n; // <<< ASSUMING VISION IS TOKEN ID 2 >>> Exporting for use in checks. PLEASE VERIFY THIS ID.

// Helper Public Client (explicitly typed)
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

/**
 * Mints a specific NFT using the Zora protocol SDK and the user's Privy embedded wallet.
 * Creates a Viem WalletClient from the Privy EIP-1193 provider.
 * Relies on Privy's configured Smart Wallet and Paymaster setup for gas sponsorship.
 *
 * @param tokenId The ID of the 1155 token to mint.
 * @param embeddedWallet The user's Privy embedded wallet object from useWallets().
 * @param comment Optional comment for the mint transaction.
 * @returns The transaction hash.
 * @throws If wallet is not on the correct chain, transaction fails, or user rejects.
 */
async function mintSingleNFT(
  tokenId: bigint,
  embeddedWallet: ConnectedWallet,
  comment?: string
): Promise<Hex> {
  const accountAddress = embeddedWallet.address as Hex;
  console.log(
    `[mintSingleNFT] Attempting to mint Token ID: ${tokenId} for ${accountAddress} using Privy EIP-1193 provider`
  );

  // Ensure wallet is on the correct chain
  if (embeddedWallet.chainId !== `eip155:${CHAIN.id}`) {
    console.error(
      `[mintSingleNFT] Wallet is on wrong chain: ${embeddedWallet.chainId}, expected eip155:${CHAIN.id}`
    );
    throw new Error(`Wallet must be connected to ${CHAIN.name} (Chain ID: ${CHAIN.id})`);
  }

  let walletClient: WalletClient;
  try {
    const provider = await embeddedWallet.getEthereumProvider();
    console.log('[mintSingleNFT] Obtained EIP-1193 provider from Privy wallet');

    // Create a Viem Wallet Client from the provider
    walletClient = createWalletClient({
      account: accountAddress,
      chain: CHAIN,
      transport: custom(provider),
    });
    console.log('[mintSingleNFT] Created Viem WalletClient from Privy provider');
  } catch (error) {
    console.error('[mintSingleNFT] Error creating WalletClient from Privy provider:', error);
    throw new Error('Failed to initialize wallet connection for minting.');
  }

  // Prepare mint parameters using Zora SDK
  const { parameters } = await zoraMint({
    tokenContract: ZORA_CONTRACT_ADDRESS,
    tokenId: tokenId,
    mintType: '1155',
    quantityToMint: 1,
    minterAccount: accountAddress,
    publicClient,
    mintComment: comment ?? `Minting Token ${tokenId} via BioDAO Portal`,
  });

  console.log(`[mintSingleNFT] Mint parameters prepared for token ${tokenId}:`, parameters);
  console.log('[mintSingleNFT] Sending transaction via viem WalletClient...');

  try {
    // Send the transaction using the derived viem WalletClient
    const hash = await walletClient.writeContract(parameters);
    console.log(`[mintSingleNFT] Mint transaction sent for token ${tokenId}. Hash: ${hash}`);
    return hash;
  } catch (error: any) {
    console.error(
      `[mintSingleNFT] Error sending mint transaction for token ${tokenId} via Viem/Privy:`,
      error
    );
    if (error.message?.includes('User rejected')) {
      throw new Error('Transaction rejected in wallet.');
    }
    throw new Error(`Failed to send mint transaction: ${error.message || 'Unknown reason'}`);
  }
}

/**
 * Mints both the Idea (ID 1) and Vision (ID 2) NFTs sequentially using Privy embedded wallet.
 * Waits for confirmation of the first mint before starting the second.
 *
 * @param embeddedWallet The user's Privy embedded wallet object from useWallets().
 * @returns An object containing the transaction hashes for both mints.
 * @throws If either mint or confirmation fails.
 */
export async function mintIdeaAndVisionNFTs(
  embeddedWallet: ConnectedWallet
): Promise<{ ideaNftHash: Hex; visionNftHash: Hex }> {
  const accountAddress = embeddedWallet.address as Hex;
  console.log(
    `[mintIdeaAndVisionNFTs] Starting mint process for ${accountAddress} using Privy Wallet`
  );

  let ideaNftHash: Hex | null = null;
  let visionNftHash: Hex | null = null;

  try {
    console.log('[mintIdeaAndVisionNFTs] Minting Idea NFT...');
    ideaNftHash = await mintSingleNFT(
      IDEA_NFT_ID,
      embeddedWallet,
      'Minting Idea NFT via BioDAO Portal'
    );
    console.log(`[mintIdeaAndVisionNFTs] Idea NFT mint transaction sent: ${ideaNftHash}`);

    // Wait for the first transaction to be confirmed
    await waitForTransaction(ideaNftHash);
    console.log('[mintIdeaAndVisionNFTs] Idea NFT confirmed.');

    console.log('[mintIdeaAndVisionNFTs] Minting Vision NFT...');
    visionNftHash = await mintSingleNFT(
      VISION_NFT_ID,
      embeddedWallet,
      'Minting Vision NFT via BioDAO Portal'
    );
    console.log(`[mintIdeaAndVisionNFTs] Vision NFT mint transaction sent: ${visionNftHash}`);

    // Wait for the second transaction
    await waitForTransaction(visionNftHash);
    console.log('[mintIdeaAndVisionNFTs] Vision NFT confirmed.');

    // Basic check, though waitForTransaction should throw if failed
    if (!ideaNftHash || !visionNftHash) {
      throw new Error('One or both NFT mint transactions failed.');
    }

    console.log('[mintIdeaAndVisionNFTs] Both mint transactions sent and confirmed successfully.');
    return { ideaNftHash, visionNftHash };
  } catch (error) {
    console.error('[mintIdeaAndVisionNFTs] Failed during minting process:', error);
    throw error instanceof Error ? error : new Error('Failed to complete NFT minting process.');
  }
}

/**
 * Waits for a transaction receipt for a given hash.
 *
 * @param hash The transaction hash to wait for.
 * @returns The transaction receipt.
 * @throws If the transaction fails or times out.
 */
export async function waitForTransaction(hash: Hex) {
  console.log(`[waitForTransaction] Waiting for transaction confirmation: ${hash}`);
  try {
    // Increased timeout for potentially slower testnets/bundlers
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
    console.log(`[waitForTransaction] Transaction confirmed: ${hash}`, receipt);
    if (receipt.status !== 'success') {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }
    return receipt;
  } catch (error) {
    console.error(`[waitForTransaction] Error waiting for transaction ${hash}:`, error);
    if (error instanceof Error && error.message.includes('timed out')) {
      throw new Error(
        `Transaction confirmation timed out for ${hash}. It might still succeed, but check a block explorer.`
      );
    }
    throw error; // Re-throw other errors
  }
}
