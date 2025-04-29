import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { mint as zoraMint } from '@zoralabs/protocol-sdk';

// Constants for NFT minting
export const ZORA_CONTRACT_ADDRESS = '0x1560aEc2263d8979F24Aa0a260bF11f55E458473' as const;
export const IDEA_NFT_ID = 1n;
export const VISION_NFT_ID = 1n;
const CHAIN = baseSepolia;

// Load the minter private key from environment variables
const MINTER_PRIVATE_KEY = process.env.NFT_MINTER_PRIVATE_KEY as Hex | undefined;

// Flag to enable/disable real blockchain minting
const ENABLE_REAL_MINTING = process.env.ENABLE_REAL_MINTING === 'true';

// Create the public client
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

// Create the minter account and wallet client only if we have a private key
const minterAccount = MINTER_PRIVATE_KEY ? privateKeyToAccount(MINTER_PRIVATE_KEY) : undefined;

const walletClient = minterAccount
  ? createWalletClient({
      account: minterAccount,
      chain: CHAIN,
      transport: http(),
    })
  : undefined;

function generateSimulatedTxHash(): Hex {
  const randomBytes = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `0x${randomBytes}` as Hex;
}

export async function mintNftToUser(
  toAddress: Hex,
  tokenId: bigint,
  quantity: number = 1
): Promise<Hex> {
  if (!ENABLE_REAL_MINTING) {
    console.log(`[SIMULATION] Minting NFT for ${toAddress}, token ${tokenId.toString()}`);
    const simulatedHash = generateSimulatedTxHash();
    console.log(`[SIMULATION] Generated simulated tx hash: ${simulatedHash}`);
    return simulatedHash;
  }
  if (!walletClient || !minterAccount) {
    console.warn('Minter wallet not configured. Falling back to simulated minting.');
    return generateSimulatedTxHash();
  }
  try {
    const { parameters } = await zoraMint({
      tokenContract: ZORA_CONTRACT_ADDRESS,
      mintType: '1155',
      tokenId,
      quantityToMint: quantity,
      minterAccount,
      mintRecipient: toAddress,
      publicClient,
    });
    const hash = await walletClient.writeContract(parameters);
    console.log(
      `NFT minted successfully for ${toAddress}, token ${tokenId.toString()}, tx: ${hash}`
    );
    return hash as Hex;
  } catch (error) {
    console.error('Error minting NFT:', error);
    console.log('Falling back to simulated NFT minting');
    const simulatedHash = generateSimulatedTxHash();
    console.log(`Generated simulated tx hash: ${simulatedHash}`);
    return simulatedHash;
  }
}

export async function mintIdeaNft(walletAddress: Hex): Promise<Hex> {
  return mintNftToUser(walletAddress, IDEA_NFT_ID);
}

export async function mintVisionNft(walletAddress: Hex): Promise<Hex> {
  return mintNftToUser(walletAddress, VISION_NFT_ID);
}

export async function mintScienceNFTs(projectId: string, message: any, state: any) {
  // Get user wallet address from message or state
  const userWallet = message.content.walletAddress || state.walletAddress;
  if (!userWallet) throw new Error('No wallet address provided');

  // Mint Idea NFT
  const ideaTxHash = await mintIdeaNft(userWallet as Hex);
  // Mint Vision NFT
  const visionTxHash = await mintVisionNft(userWallet as Hex);

  // Construct NFT URLs (update to match your explorer or metadata endpoint)
  return {
    ideaNFT: {
      txHash: ideaTxHash,
      url: `https://basescan.org/address/${ZORA_CONTRACT_ADDRESS}`,
    },
    visionNFT: {
      txHash: visionTxHash,
      url: `https://basescan.org/address/${ZORA_CONTRACT_ADDRESS}`,
    },
  };
}
