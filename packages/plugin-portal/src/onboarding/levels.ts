// Level definitions and requirements for BioDAO onboarding

export interface LevelDefinition {
  label: string;
  requirements: string[];
}

export const LEVELS: Record<number, LevelDefinition> = {
  1: {
    label: 'App Started',
    requirements: ['Wallet connected'],
  },
  2: {
    label: 'Science NFTs Minted',
    requirements: ['Minted Idea NFT', 'Minted Hypothesis NFT'],
  },
  3: {
    label: 'Community Initiated',
    requirements: ['Discord created', '4 Discord members'],
  },
  4: {
    label: 'Community Growth + Proof',
    requirements: ['5 Discord members', '5 papers shared', '50 messages sent'],
  },
};

export function getNextLevelRequirements(currentLevel: number): string[] {
  switch (currentLevel) {
    case 1:
      return ['Mint Idea NFT', 'Mint Vision NFT'];
    case 2:
      return ['Create Discord Server', 'Reach 4+ Members'];
    case 3:
      return ['Reach 5+ Members', 'Share 5+ Scientific Papers', 'Send 50+ Messages'];
    case 4:
      return ['All requirements met - Bio team will contact you'];
    default:
      return ['Connect your wallet to start your BioDAO journey'];
  }
}
