// packages/client/src/lib/smart-wallet.ts
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { usePrivy } from '@privy-io/react-auth';

// Helper to get the user's smart wallet address
export function getSmartWalletAddress(user: any): string | undefined {
  // Find the smart wallet account in linkedAccounts
  const smartWallet = user?.linkedAccounts?.find((account: any) => account.type === 'smart_wallet');
  return smartWallet?.address;
}

// Helper to send a transaction using Privy's smart wallet client
// Usage: await sendWithPrivySmartWallet(client, { to, value, data, chain })
export async function sendWithPrivySmartWallet(
  client: any,
  tx: { to: string; value?: bigint; data?: string; chain?: any; uiOptions?: any }
) {
  // See https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/usage#send-a-transaction
  return client.sendTransaction(
    {
      to: tx.to,
      value: tx.value ?? 0n,
      data: tx.data ?? '0x',
      chain: tx.chain, // optional, e.g. baseSepolia
    },
    tx.uiOptions
  );
}

// Example React usage:
// const { user } = usePrivy();
// const { client } = useSmartWallets();
// const address = getSmartWalletAddress(user);
// await sendWithPrivySmartWallet(client, { to, value, data });
