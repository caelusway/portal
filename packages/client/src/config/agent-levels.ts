// Updated file: packages/client/src/config/agent-levels.ts
export interface AgentLevel {
  level: number;
  name: string;
  description: string;
  entryMessage: string;
  levelupRequirements: string[];
  capabilities: string[];
  // Add metrics requirements
  metricRequirements?: {
    daoMembers?: number;
    papersShared?: number;
    messagesSent?: number;
    discordCreated?: boolean;
    nftsMinted?: number;
  };
  suggestedActions?: {
    label: string;
    actionType: 'show_module';
    actionTarget: string;
    condition?: (state: any) => boolean;
  }[];
}

export const agentLevels: Record<number, AgentLevel> = {
  1: {
    level: 1,
    name: 'Inception Stage',
    description: 'Begin your scientific journey by minting your first science NFTs.',
    entryMessage:
      "Welcome to BioDAO! Let's start by minting your first science NFTs to establish your project's foundation.",
    levelupRequirements: ['Mint 3 Science NFTs'],
    capabilities: ['NFT minting', 'Scientific documentation', 'Project setup assistance'],
    metricRequirements: {
      nftsMinted: 3,
    },
    suggestedActions: [
      {
        label: 'Mint Science NFTs 🧪',
        actionType: 'show_module',
        actionTarget: 'science_bank',
      },
    ],
  },
  2: {
    level: 2,
    name: 'Community Builder',
    description: 'Create a community around your scientific project.',
    entryMessage:
      "Congratulations on reaching level 2! Now it's time to build your community by creating a Discord server and inviting members.",
    levelupRequirements: [
      'Create a Discord server for your project',
      'Invite our Discord bot',
      'Grow your community to 4 members',
    ],
    capabilities: ['Discord setup', 'Team invitation', 'Community building'],
    metricRequirements: {
      daoMembers: 4,
      discordCreated: true,
    },
    suggestedActions: [
      {
        label: 'Create Discord Server 💬',
        actionType: 'show_module',
        actionTarget: 'discord_creator',
      },
      {
        label: 'Invite Team Members 👥',
        actionType: 'show_module',
        actionTarget: 'team_inviter',
      },
    ],
  },
  3: {
    level: 3,
    name: 'Scientific Collaborator',
    description: 'Scale your community and research collaboration.',
    entryMessage:
      'Welcome to level 3! Focus on expanding your community and sharing scientific papers in Discord to reach the next level.',
    levelupRequirements: [
      'Grow your community to 10 members',
      'Share 25 scientific papers',
      'Reach 100 messages in Discord (No Spam)',
    ],
    capabilities: ['Advanced community tools', 'Paper sharing', 'Scientific collaboration'],
    metricRequirements: {
      daoMembers: 10,
      papersShared: 25,
      messagesSent: 100,
    },
    suggestedActions: [
      {
        label: 'Invite More Members 👥',
        actionType: 'show_module',
        actionTarget: 'team_inviter',
      },
      {
        label: 'Share Scientific Papers 📄',
        actionType: 'show_module',
        actionTarget: 'paper_sharing',
      },
    ],
  },
  4: {
    level: 4,
    name: 'Ecosystem Partner',
    description: "Bio team is now available to you, they'll reach out shortly.",
    entryMessage:
      'Congratulations on reaching level 4! You have successfully built a community with 10+ members, shared 25+ scientific papers, and had 100+ messages in your Discord. The Bio team will contact you shortly.',
    levelupRequirements: [], // No more requirements for max level
    capabilities: [
      'Full ecosystem access',
      'Advanced analytics',
      'Expert networks',
      'Funding opportunities',
      'Community dashboard',
    ],
    metricRequirements: {}, // No metrics needed for max level
    suggestedActions: [
      {
        label: 'Explore Community Dashboard 📊',
        actionType: 'show_module',
        actionTarget: 'community_dashboard',
      },
      {
        label: 'Connect with Experts 👩‍🔬',
        actionType: 'show_module',
        actionTarget: 'expert_directory',
      },
      {
        label: 'Access Resources 🔍',
        actionType: 'show_module',
        actionTarget: 'advanced_resources',
      },
    ],
  },
};

export const LEVELS = {
  1: {
    label: 'Science NFT Creation',
    entryMessage:
      "Welcome to BioProtocol! I'm CoreAgent, your guide to launching your DeSci project. Let's start by creating Science NFTs for your scientific concept.",
    requirements: ['Create Idea NFT', 'Create Vision NFT'],
    capabilities: ['Science NFT Creation'],
    suggestedActions: [
      'Can you help me create my Science NFTs?',
      'What is the BioProtocol?',
      'How do Science NFTs work?',
    ],
  },
  2: {
    label: 'Community Setup',
    entryMessage:
      "Congratulations on minting your Science NFTs! Now, let's set up your community on Discord to start building your BioDAO.",
    requirements: ['Create Discord server', 'Add CoreAgent bot to server'],
    capabilities: ['Discord Server Setup', 'Community Building Guidance'],
    suggestedActions: [
      'How do I set up my Discord?',
      'What should I include in my Discord?',
      'Can you verify my Discord?',
    ],
  },
  3: {
    label: 'Community Initiated',
    entryMessage:
      "Your Discord server is set up! Now it's time to grow your community and start sharing scientific papers.",
    requirements: [
      'Reach 10+ Discord members',
      'Share 25+ scientific papers',
      'Send 100+ messages',
    ],
    capabilities: ['Community Growth Strategy', 'Member Tracking', 'Scientific Content Guidance'],
    suggestedActions: [
      'How can I grow my Discord?',
      'What types of papers should we share?',
      'How many members/papers do I have now?',
    ],
  },
  4: {
    label: 'Scientific Proof',
    entryMessage:
      "Congratulations! You've successfully built your community with 10+ members, shared 25+ papers, and sent 100+ messages. You've completed all the requirements for the BioProtocol onboarding.",
    requirements: [
      'All requirements met (10+ Discord members, 25+ papers shared, 100+ messages)',
      'Speak with Bio team',
    ],
    capabilities: ['Full Ecosystem Access', 'Expert Connections', 'Strategic Guidance'],
    suggestedActions: [
      'When will the Bio team contact me?',
      'What should I prepare for my call?',
      'How can I continue building my BioDAO?',
    ],
  },
} as const;
