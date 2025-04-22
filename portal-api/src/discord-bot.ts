import {
  Client,
  GatewayIntentBits,
  Events,
  Guild,
  Message,
  TextChannel,
  GuildMember,
} from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';
import {
  detectPaper,
  evaluatePaperQuality,
  extractPaperMetadata,
  analyzeScientificPdf,
} from './paper-detection';

dotenv.config();

const PORTAL_API_URL = process.env.PORTAL_API_URL || 'http://localhost:3001';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const API_KEY = process.env.API_KEY || process.env.PORTAL_API_KEY;

/**
 * BioDAO Discord Bot for Community Metrics
 *
 * This bot tracks community engagement metrics for BioDAO communities:
 * - Member counts
 * - Message activity
 * - Papers shared
 * - Quality score based on engagement patterns
 *
 * The data is used by the CoreAgent to automatically progress users through levels
 * as they meet community growth milestones.
 */

// Guild stats tracking
interface GuildStats {
  messageCount: number;
  papersShared: number;
  qualityScore: number;
  lastMessageTimestamp: Date;
  activeUsers: Set<string>; // Track unique active users
}

const guildStats: Map<string, GuildStats> = new Map();

// Paper detection keywords and patterns
const PAPER_KEYWORDS = [
  'research paper',
  'scientific paper',
  'study',
  'findings',
  'journal',
  'published',
  'publication',
  'research',
  'abstract',
  'methodology',
  'results',
  'conclusion',
  'doi',
  'peer-reviewed',
];

const PAPER_DOMAINS = [
  'arxiv.org',
  'nature.com',
  'science.org',
  'cell.com',
  'pubmed',
  'ncbi.nlm.nih.gov',
  'sciencedirect.com',
  'biorxiv.org',
  'medrxiv.org',
  'researchgate.net',
  'jstor.org',
  'scholar.google.com',
  'pnas.org',
  'frontiersin.org',
  'plos.org',
  'sciencemag.org',
  'jbc.org',
];

// Message quality and spam detection configuration
const MESSAGE_CONFIG = {
  SPAM_THRESHOLD: 30, // Messages below this score are considered spam (scale 0-100)
  MIN_QUALITY_LENGTH: 8, // Minimum characters for a message to be potentially non-spam
  MAX_FREQUENCY_PER_USER: 5, // Max messages per minute from one user before applying penalty
  SIMILAR_MESSAGE_THRESHOLD: 0.8, // Similarity threshold to detect repeated messages (0-1)
  COOLDOWN_PERIOD_MS: 60000, // 1 minute cooldown for frequency checking
  QUALITY_CHECK_INTERVAL_MS: 10 * 60 * 1000, // Perform quality check every 10 minutes
  HISTORY_SIZE: 1000, // Maximum history size for message frequency tracking
};

// Track message history for spam detection
interface MessageHistoryItem {
  userId: string;
  content: string;
  timestamp: Date;
  qualityScore: number;
}

// Map of guild IDs to their message history arrays
const guildMessageHistory: Map<string, MessageHistoryItem[]> = new Map();

// Track user message frequency
interface UserMessageFrequency {
  lastMessages: Date[];
  penaltyFactor: number; // Reduces message quality when spamming detected
}

// Map of userIds to their message frequency data
const userMessageFrequency: Map<string, UserMessageFrequency> = new Map();

// Add a command prefix for the bot to respond to
const COMMAND_PREFIX = '!biodao';

// Valid commands
const COMMANDS = {
  HELP: 'help',
  STATS: 'stats',
  QUALITY: 'quality',
  PAPERS: 'papers',
  TIPS: 'tips',
  PROGRESS: 'progress',
};

// Help messages for commands
const HELP_MESSAGES = {
  [COMMANDS.HELP]: 'Shows this help message',
  [COMMANDS.STATS]: 'Shows current community stats',
  [COMMANDS.QUALITY]: 'Explains how message quality is measured',
  [COMMANDS.PAPERS]: 'Shows tips for sharing research papers',
  [COMMANDS.TIPS]: 'Provides tips for improving community engagement',
  [COMMANDS.PROGRESS]: 'Shows current progress toward next level',
};

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Handle bot ready event
client.once(Events.ClientReady, () => {
  console.log(`BioDAO Bot logged in as ${client.user?.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guilds`);

  // Initialize tracking for all current guilds
  client.guilds.cache.forEach((guild) => {
    initializeGuildStats(guild);
  });

  // Set up periodic stats updates
  setInterval(updateAllGuildStats, 30 * 60 * 1000); // Update every 30 minutes
});

/**
 * Initialize stats tracking for a guild
 */
function initializeGuildStats(guild: Guild): void {
  console.log(`Initializing stats for guild: ${guild.name} (${guild.id})`);

  // Create fresh stats object
  guildStats.set(guild.id, {
    messageCount: 0,
    papersShared: 0,
    qualityScore: 50, // Default mid-range score
    lastMessageTimestamp: new Date(),
    activeUsers: new Set<string>(),
  });

  // Initialize message history for this guild
  guildMessageHistory.set(guild.id, []);

  // Immediately send initial stats to API
  notifyPortalAPI(guild.id, 'stats_update');

  // Set up quality check interval for this guild
  setInterval(() => {
    evaluateMessageQuality(guild.id);
  }, MESSAGE_CONFIG.QUALITY_CHECK_INTERVAL_MS);
}

// Handle guild join event
client.on(Events.GuildCreate, async (guild: Guild) => {
  console.log(`Bot added to guild: ${guild.name} (${guild.id})`);

  // Initialize stats tracking for this guild
  initializeGuildStats(guild);

  // Notify Portal API that bot was installed
  await notifyPortalAPI(guild.id, 'guildCreate');

  // Send welcome message in general channel if possible
  try {
    const generalChannel = guild.channels.cache.find(
      (channel) => channel.name.includes('general') && channel.isTextBased()
    ) as TextChannel;

    if (generalChannel) {
      await generalChannel.send(
        "Hello everyone! 👋 I'm the BioDAO tracking bot and I've been added to help track community metrics " +
          'like member count, activity levels, and scientific papers shared. ' +
          "I operate silently and won't respond to commands - I just watch and learn. " +
          'All interaction with the BioDAO system should happen through the web interface. ' +
          'Happy researching! 🧬🔬'
      );
    }
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
});

// Track when members join
client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
  const guild = member.guild;
  console.log(`New member joined ${guild.name}: ${member.user.username}`);

  // Update member count immediately when someone joins
  await notifyPortalAPI(guild.id, 'stats_update');

  // Check level requirements when specific member count thresholds are hit
  const memberCount = guild.memberCount;
  if (memberCount === 4 || memberCount === 10 || memberCount % 5 === 0) {
    console.log(
      `[Discord Bot] Member milestone reached (${memberCount}) - checking level requirements`
    );
    await checkGuildLevelRequirements(guild.id);
  }
});

/**
 * Determine if a message is too simple to count as a meaningful contribution
 * This filters out basic greetings, single-word replies, and other low-value messages
 */
function isLowValueMessage(content: string): boolean {
  // Normalize the content
  const normalizedContent = content.toLowerCase().trim();

  // Skip messages that are too short (less than 5 characters)
  if (normalizedContent.length < 5) {
    return true;
  }

  // Common greetings and basic responses that don't contribute meaningful content
  const lowValuePatterns = [
    /^(hi|hey|hello|sup|yo|gm|good morning|good evening|good night|gn|bye|cya|see ya|lol|ok|okay|k|sure|yes|no|maybe|thanks|thx|ty|np|yw|welcome)$/i,
    /^(what'?s up|how are you|how's it going)$/i,
    /^(nice|cool|great|awesome|amazing|good|bad|sad|happy|lmao|lmfao|rofl|oof|rip|f)$/i,
    /^((?:ha){1,5})$/i, // matches: ha, haha, hahaha, etc.
    /^[👋👍👎❤️😂🙏]+$/u, // just emojis
  ];

  // Check against common low-value patterns
  for (const pattern of lowValuePatterns) {
    if (pattern.test(normalizedContent)) {
      return true;
    }
  }

  // Count words - messages with only 1-2 words are usually low value
  const wordCount = normalizedContent.split(/\s+/).filter((word) => word.length > 0).length;
  if (wordCount <= 2) {
    return true;
  }

  // Not a low-value message
  return false;
}

// Handle incoming messages
client.on(Events.MessageCreate, async (message: Message) => {
  // Skip bot messages
  if (message.author.bot) return;

  // Skip messages not in a guild (DMs)
  if (!message.guild) return;

  const guildId = message.guild.id;

  // Initialize guild stats if needed
  if (!guildStats.has(guildId)) {
    initializeGuildStats(message.guild);
  }

  // Get current stats
  const stats = guildStats.get(guildId);
  if (!stats) return;

  // Initialize user frequency tracking
  const userId = message.author.id;
  if (!userMessageFrequency.has(userId)) {
    userMessageFrequency.set(userId, {
      lastMessages: [],
      penaltyFactor: 1.0,
    });
  }

  // Check if this is a command
  if (message.content.startsWith(COMMAND_PREFIX)) {
    handleBotCommand(message).catch(console.error);
    return;
  }

  // Skip low value messages
  const isLowValue = isLowValueMessage(message.content);
  if (isLowValue) {
    // Don't process further but log for debugging
    if (process.env.DEBUG) {
      console.log(`Ignoring low-value message from ${message.author.tag}: "${message.content}"`);
    }
    return;
  }

  // Get message history for this guild or initialize it
  let messageHistory = guildMessageHistory.get(guildId) || [];

  // Calculate raw message quality based on content
  const rawQuality = calculateMessageQuality(message.content);

  // Apply penalty for rapid message frequency
  const userFrequency = userMessageFrequency.get(userId)!;
  updateUserMessageFrequency(userId);

  // Calculate similarity penalty (to avoid repetitive content)
  const similarityPenalty = calculateMessageSimilarityPenalty(
    message.content,
    messageHistory,
    userId
  );

  // Calculate final quality score
  const finalQuality = Math.max(0, rawQuality * userFrequency.penaltyFactor * similarityPenalty);
  const isQualityMessage = finalQuality >= MESSAGE_CONFIG.SPAM_THRESHOLD;

  // Add message to history
  messageHistory.push({
    userId: message.author.id,
    content: message.content,
    timestamp: new Date(),
    qualityScore: finalQuality,
  });

  // Limit history size
  if (messageHistory.length > MESSAGE_CONFIG.HISTORY_SIZE) {
    messageHistory = messageHistory.slice(-MESSAGE_CONFIG.HISTORY_SIZE);
  }

  // Update guild message history
  guildMessageHistory.set(guildId, messageHistory);

  // Only count quality messages toward the stats
  if (isQualityMessage) {
    stats.messageCount++;

    // Track unique active users
    stats.activeUsers.add(message.author.id);

    // Update last activity timestamp
    stats.lastMessageTimestamp = new Date();
  }

  // Enhanced scientific papers detection with PDF analysis
  let isPaper = false;
  let paperAnalysis = null;
  let pdfAttachment = null;

  // Check if there are any PDF attachments
  for (const [, attachment] of message.attachments) {
    const filename = attachment.name?.toLowerCase() || '';
    if (filename.endsWith('.pdf')) {
      pdfAttachment = attachment;
      // Analyze the PDF to see if it's likely a scientific paper
      paperAnalysis = analyzeScientificPdf(attachment.name || '', attachment.size);

      // Log the analysis for debugging
      console.log(
        `PDF Analysis for "${attachment.name}": confidence=${paperAnalysis.confidence}, isScientificPaper=${paperAnalysis.isScientificPaper}`
      );
      console.log(`Reason: ${paperAnalysis.reason}`);

      if (paperAnalysis.isScientificPaper) {
        isPaper = true;
        break;
      }
    }
  }

  // If no PDF attachment was identified as a paper, try the regular detection
  if (!isPaper) {
    const hasAttachment = message.attachments.size > 0;
    isPaper = detectPaper(message.content, hasAttachment);
  }

  // Update stats if it's a paper
  if (isPaper) {
    stats.papersShared++;

    // Extract paper metadata if possible for better logging
    const paperMetadata = extractPaperMetadata(message.content);
    const paperScore = evaluatePaperQuality(message.content, !!pdfAttachment);

    // Log the detected paper with metadata if available
    if (paperMetadata) {
      console.log(`Scientific paper detected in ${message.guild?.name} - Score: ${paperScore}/100`);
      console.log(`Title: ${paperMetadata.title || 'Unknown'}`);
      console.log(`DOI: ${paperMetadata.doi || 'Unknown'}`);
      console.log(`Authors: ${paperMetadata.authors || 'Unknown'}`);
      console.log(`Year: ${paperMetadata.year || 'Unknown'}`);
    } else if (paperAnalysis && paperAnalysis.isScientificPaper) {
      console.log(
        `Scientific paper PDF detected in ${message.guild?.name} - Score: ${paperAnalysis.confidence}/100`
      );
      console.log(`Filename: ${pdfAttachment?.name || 'Unknown'}`);
      console.log(
        `Size: ${pdfAttachment?.size ? (pdfAttachment.size / 1024).toFixed(2) + 'KB' : 'Unknown'}`
      );
      console.log(`Reason: ${paperAnalysis.reason}`);
    } else {
      console.log(`Scientific paper detected in ${message.guild?.name}. Score: ${paperScore}/100`);
    }

    // Respond with a confirmation reaction to let users know the paper was counted
    try {
      await message.react('📚');
    } catch (error) {
      console.error('Failed to react to paper message:', error);
    }

    // If we detect a paper, update the API more frequently
    // This helps users level up faster when they're actively sharing research
    if (stats.papersShared % 5 === 0) {
      notifyPortalAPI(guildId, 'stats_update').catch(console.error);
    }

    // Check for level-up requirements after paper detection - papers are key metrics
    await checkGuildLevelRequirements(guildId);
  }

  // Update quality score using weighted average (90% old, 10% new)
  // Only apply quality updates from non-spam messages
  if (isQualityMessage) {
    stats.qualityScore = 0.9 * stats.qualityScore + 0.1 * finalQuality;
  }

  // Log message quality info for debugging
  if (process.env.DEBUG) {
    console.log(
      `Message quality: raw=${rawQuality.toFixed(1)}, penalty=${userFrequency.penaltyFactor.toFixed(1)}, similarity=${similarityPenalty.toFixed(1)}, final=${finalQuality.toFixed(1)}, isQuality=${isQualityMessage}, isLowValue=${isLowValue}`
    );
  }

  // Update stats to API every 50 quality messages
  if (isQualityMessage && stats.messageCount % 50 === 0) {
    notifyPortalAPI(guildId, 'stats_update').catch(console.error);
  }

  // Check level requirements when message count hits thresholds
  // This triggers level checks at key milestone points
  if (
    isQualityMessage &&
    (stats.messageCount === 50 ||
      stats.messageCount === 100 ||
      stats.messageCount === 150 ||
      stats.messageCount % 25 === 0)
  ) {
    console.log(
      `[Discord Bot] Message milestone reached (${stats.messageCount}) - checking level requirements`
    );
    await checkGuildLevelRequirements(guildId);
  }
});

// Replace the handleBotCommand function with a stub that does nothing but logs
async function handleBotCommand(message: Message): Promise<void> {
  console.log(`Command handling disabled: ${message.content}`);
  // We no longer respond to commands
  return;
}

/**
 * Send help information about available commands
 */
async function sendHelpMessage(message: Message): Promise<void> {
  let helpText = `**BioDAO Bot Commands**\n\n`;

  Object.entries(HELP_MESSAGES).forEach(([cmd, description]) => {
    helpText += `\`${COMMAND_PREFIX} ${cmd}\` - ${description}\n`;
  });

  helpText += `\nFor more info about BioDAO, visit: https://bio.xyz`;

  await message.reply(helpText);
}

/**
 * Send current community stats
 */
async function sendStatsMessage(message: Message, stats: any, guildId: string): Promise<void> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const statsEmbed = {
    color: 0x7289da,
    title: `${guild.name} - Community Stats`,
    description: 'Current statistics for your research community:',
    fields: [
      {
        name: '👥 Members',
        value: `${guild.memberCount}`,
        inline: true,
      },
      {
        name: '📝 Messages',
        value: `${stats.messageCount}`,
        inline: true,
      },
      {
        name: '📊 Quality Score',
        value: `${Math.round(stats.qualityScore)}/100`,
        inline: true,
      },
      {
        name: '📚 Papers Shared',
        value: `${stats.papersShared}`,
        inline: true,
      },
      {
        name: '👨‍👩‍👧‍👦 Active Users',
        value: `${stats.activeUsers.size}`,
        inline: true,
      },
      {
        name: '🕒 Last Activity',
        value: `<t:${Math.floor(stats.lastMessageTimestamp.getTime() / 1000)}:R>`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Stats are updated periodically',
    },
  };

  await message.reply({ embeds: [statsEmbed] });
}

/**
 * Explain how message quality is measured
 */
async function sendQualityInfoMessage(message: Message): Promise<void> {
  const qualityEmbed = {
    color: 0x7289da,
    title: '📈 Message Quality System',
    description: 'How BioDAO measures the quality of your community discussions:',
    fields: [
      {
        name: '✅ What Counts as Quality',
        value: [
          '• Longer, thoughtful messages',
          '• Formatted text (paragraphs, lists, bold)',
          '• Sharing links with context',
          '• Discussing papers in depth',
          '• Asking substantive questions',
          '• Responding with detailed answers',
        ].join('\n'),
      },
      {
        name: '❌ What Hurts Quality',
        value: [
          '• Very short messages (\"ok\", \"thanks\")',
          '• Spam or repeated messages',
          '• Multiple messages in rapid succession',
          '• Off-topic conversations',
          '• Low-effort reactions',
        ].join('\n'),
      },
      {
        name: '⚠️ Anti-Spam Measures',
        value:
          "Our system detects spam patterns and repeated messages. These do not count toward your community's message total.",
      },
      {
        name: '🎯 Level Requirements',
        value:
          'To reach Level 4, your community must have a quality score of at least 70/100, along with meeting member and paper requirements.',
      },
    ],
  };

  await message.reply({ embeds: [qualityEmbed] });
}

/**
 * Provide tips for sharing papers
 */
async function sendPaperSharingTips(message: Message): Promise<void> {
  const papersEmbed = {
    color: 0x7289da,
    title: '📚 How to Share Research Papers',
    description: 'Tips for sharing papers that will be detected by our system:',
    fields: [
      {
        name: '📎 Best Ways to Share',
        value: [
          '• Upload PDF files directly',
          '• Share links to papers with DOIs',
          '• Include links to scientific repositories (arXiv, bioRxiv, etc.)',
          '• Paste the full paper citation',
        ].join('\n'),
      },
      {
        name: '🔍 Include These Elements',
        value: [
          '• Paper title in quotes',
          '• Author names and year',
          '• DOI (Digital Object Identifier)',
          '• Journal name',
          '• Brief description of why the paper is interesting',
        ].join('\n'),
      },
      {
        name: '💼 Example Paper Share',
        value:
          '\"Advances in Neural Information Processing Systems\" by Smith et al. (2023). doi:10.1234/example.2023.001\nThis paper introduces a new approach to...',
      },
      {
        name: '🔎 Supported Paper Sources',
        value:
          'arXiv, bioRxiv, medRxiv, Nature, Science, Cell, PNAS, PubMed, PLoS, and many other scientific repositories.',
      },
    ],
  };

  await message.reply({ embeds: [papersEmbed] });
}

/**
 * Provide community engagement tips
 */
async function sendCommunityTips(message: Message): Promise<void> {
  const tipsEmbed = {
    color: 0x7289da,
    title: '💡 Community Growth Tips',
    description: 'How to boost engagement in your research community:',
    fields: [
      {
        name: '👥 Grow Your Member Base',
        value: [
          '• Share your invite link in relevant research forums',
          '• Invite colleagues from your institution',
          '• Host virtual meetups or journal clubs',
          '• Create topic-specific channels',
        ].join('\n'),
      },
      {
        name: '📚 Encourage Paper Sharing',
        value: [
          '• Set a weekly paper discussion theme',
          '• Ask members to share the most interesting paper they read recently',
          '• Create a dedicated papers channel',
          '• Share your own research or preprints',
        ].join('\n'),
      },
      {
        name: '💬 Foster Quality Discussions',
        value: [
          '• Ask specific questions about shared papers',
          '• Highlight interesting methodologies or findings',
          '• Connect papers to ongoing research topics',
          '• Encourage members to explain complex concepts',
        ].join('\n'),
      },
      {
        name: '🌟 Best Practices',
        value:
          'Regular, meaningful engagement is better than sporadic activity. Quality over quantity!',
      },
    ],
  };

  await message.reply({ embeds: [tipsEmbed] });
}

/**
 * Send information about progress toward the next level
 */
async function sendProgressInfo(message: Message, stats: any, guildId: string): Promise<void> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  try {
    // Try to fetch Discord record from the database to get level info
    const discordInfo = await fetchDiscordInfoFromAPI(guildId);

    if (!discordInfo || !discordInfo.user) {
      await message.reply('Unable to retrieve level information. Please try again later.');
      return;
    }

    const { level } = discordInfo.user;

    let progressTitle = 'Community Progress';
    let progressDescription = '';
    // Properly type progressFields
    let progressFields: Array<{ name: string; value: string; inline?: boolean }> = [];

    // Different progress metrics based on level
    if (level === 2) {
      progressTitle = 'Progress to Level 3';
      progressDescription = 'You need 4+ members to reach Level 3';

      const memberProgress = Math.min(100, (guild.memberCount / 4) * 100);

      progressFields = [
        {
          name: '👥 Members',
          value: `${guild.memberCount}/4 (${Math.round(memberProgress)}% complete)`,
          inline: true,
        },
        {
          name: 'Next Steps',
          value: 'Invite more members to your Discord server',
          inline: false,
        },
      ];
    } else if (level === 3) {
      progressTitle = 'Progress to Level 4';
      progressDescription = 'Requirements for Level 4:';

      const memberProgress = Math.min(100, (guild.memberCount / 10) * 100);
      const papersProgress = Math.min(100, (stats.papersShared / 25) * 100);
      const messagesProgress = Math.min(100, (stats.messageCount / 100) * 100);
      const qualityProgress = Math.min(100, (stats.qualityScore / 70) * 100);

      progressFields = [
        {
          name: '👥 Members',
          value: `${guild.memberCount}/10 (${Math.round(memberProgress)}% complete)`,
          inline: true,
        },
        {
          name: '📚 Papers Shared',
          value: `${stats.papersShared}/25 (${Math.round(papersProgress)}% complete)`,
          inline: true,
        },
        {
          name: '💬 Messages',
          value: `${stats.messageCount}/100 (${Math.round(messagesProgress)}% complete)`,
          inline: true,
        },
        {
          name: '📊 Quality Score',
          value: `${Math.round(stats.qualityScore)}/70 (${Math.round(qualityProgress)}% complete)`,
          inline: true,
        },
      ];

      // Add next steps based on what's missing
      let nextSteps = [];
      if (guild.memberCount < 10) nextSteps.push('Invite more members');
      if (stats.papersShared < 25) nextSteps.push('Share more research papers');
      if (stats.messageCount < 100) nextSteps.push('Encourage more discussion');
      if (stats.qualityScore < 70)
        nextSteps.push('Improve message quality (use !biodao quality for tips)');

      if (nextSteps.length > 0) {
        progressFields.push({
          name: 'Next Steps',
          value: nextSteps.join('\n'),
          inline: false,
        });
      }
    } else if (level === 4) {
      progressTitle = 'Maximum Level Reached';
      progressDescription = "Congratulations! You've reached Level 4 - Sandbox Access.";

      progressFields = [
        {
          name: '🎉 Achievement Unlocked',
          value:
            "You've built a thriving research community! Continue growing your community and engaging in scientific discussions.",
          inline: false,
        },
      ];
    }

    const progressEmbed = {
      color: 0x7289da,
      title: progressTitle,
      description: progressDescription,
      fields: progressFields,
      timestamp: new Date().toISOString(),
    };

    await message.reply({ embeds: [progressEmbed] });
  } catch (error) {
    console.error('Error fetching progress info:', error);
    await message.reply('Unable to retrieve progress information. Please try again later.');
  }
}

/**
 * Fetch Discord info from the API
 */
async function fetchDiscordInfoFromAPI(guildId: string): Promise<any> {
  try {
    const response = await axios.get(`${PORTAL_API_URL}/api/discord/info/${guildId}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching Discord info:', error);
    return null;
  }
}

/**
 * Updates the message frequency tracking for a user to detect spam behavior
 * @param userId The user ID to update frequency for
 */
function updateUserMessageFrequency(userId: string): void {
  const userFrequency = userMessageFrequency.get(userId);
  if (!userFrequency) return;

  const now = new Date();

  // Add current message timestamp
  userFrequency.lastMessages.push(now);

  // Remove messages older than cooldown period
  userFrequency.lastMessages = userFrequency.lastMessages.filter(
    (time) => now.getTime() - time.getTime() < MESSAGE_CONFIG.COOLDOWN_PERIOD_MS
  );

  // Check if user is sending too many messages too quickly
  if (userFrequency.lastMessages.length > MESSAGE_CONFIG.MAX_FREQUENCY_PER_USER) {
    // Apply penalty to user's message quality
    userFrequency.penaltyFactor = 0.5; // 50% quality reduction for spamming
    console.log(`Spam behavior detected from user ${userId} - applying quality penalty`);
  } else {
    // Gradually restore penalty factor if user stops spamming
    userFrequency.penaltyFactor = Math.min(1.0, userFrequency.penaltyFactor + 0.1);
  }
}

/**
 * Calculate message similarity penalty
 */
function calculateMessageSimilarityPenalty(
  content: string,
  messageHistory: MessageHistoryItem[],
  userId: string
): number {
  // Get the last 5 messages from the user
  const userRecentMessages = messageHistory.filter((item) => item.userId === userId).slice(-5);

  // Calculate similarity between the new message and the recent messages
  for (const prevMessage of userRecentMessages) {
    const similarity = calculateStringSimilarity(prevMessage.content, content);
    if (similarity > MESSAGE_CONFIG.SIMILAR_MESSAGE_THRESHOLD) {
      return 0.3; // 70% penalty for very similar message
    }
  }

  return 1.0; // Default penalty if no similar message found
}

/**
 * Calculate message quality score (0-100)
 */
function calculateMessageQuality(content: string): number {
  let score = 0;

  // Base score on length (up to 40 points)
  const length = content.length;
  score += Math.min(40, length / 5);

  // Add points for formatting that indicates thoughtful content
  if (content.includes('```')) score += 10; // Code blocks
  if (content.match(/\*\*.*\*\*/)) score += 5; // Bold text
  if (content.match(/\[.*\]\(.*\)/)) score += 10; // Links with proper formatting
  if (content.includes('\n\n')) score += 5; // Multiple paragraphs
  if (content.match(/\d+\./)) score += 10; // Numbered lists
  if (content.match(/^>.*$/m)) score += 10; // Quotes

  // Cap at 100
  return Math.min(100, score);
}

/**
 * Calculate similarity between two strings (0-1 scale)
 * Uses Dice's coefficient for efficient string comparison
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  // For very short messages, do exact matching
  if (str1.length < 10 && str2.length < 10) {
    return str1.toLowerCase() === str2.toLowerCase() ? 1.0 : 0.0;
  }

  // Normalize and clean strings
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  // Create bigrams
  const createBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigrams1 = createBigrams(s1);
  const bigrams2 = createBigrams(s2);

  // Count intersection
  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersection++;
    }
  }

  // Calculate Dice's coefficient
  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Evaluate message quality across the guild and update statistics
 */
function evaluateMessageQuality(guildId: string): void {
  const stats = guildStats.get(guildId);
  const messageHistory = guildMessageHistory.get(guildId);
  if (!stats || !messageHistory) return;

  console.log(`Evaluating message quality for guild ${guildId}`);

  // Get the last 24 hours of messages
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentMessages = messageHistory.filter((msg) => msg.timestamp > oneDayAgo);

  // Count quality messages
  const qualityMessages = recentMessages.filter(
    (msg) => msg.qualityScore > MESSAGE_CONFIG.SPAM_THRESHOLD
  );

  // Calculate percentage of quality messages
  const qualityPercentage =
    recentMessages.length > 0 ? (qualityMessages.length / recentMessages.length) * 100 : 0;

  console.log(
    `Guild ${guildId} quality evaluation: ${qualityMessages.length}/${recentMessages.length} quality messages (${qualityPercentage.toFixed(1)}%)`
  );

  // If less than 50% of messages are quality, apply a penalty to the overall quality score
  if (recentMessages.length > 10 && qualityPercentage < 50) {
    stats.qualityScore = Math.max(30, stats.qualityScore * 0.9);
    console.log(
      `Applied quality penalty to guild ${guildId}, new score: ${stats.qualityScore.toFixed(1)}`
    );
  }

  // If more than 80% of messages are quality, apply a bonus
  if (recentMessages.length > 10 && qualityPercentage > 80) {
    stats.qualityScore = Math.min(100, stats.qualityScore * 1.1);
    console.log(
      `Applied quality bonus to guild ${guildId}, new score: ${stats.qualityScore.toFixed(1)}`
    );
  }

  // Update API with latest stats
  notifyPortalAPI(guildId, 'stats_update').catch(console.error);
}

/**
 * Notifies the Portal API about guild events (creation or stats updates)
 */
async function notifyPortalAPI(
  guildId: string,
  eventType: 'guildCreate' | 'stats_update'
): Promise<void> {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`Cannot update stats: Guild ${guildId} not found`);
      return;
    }

    // First, fetch current database stats to get the latest paper count
    let currentDatabaseStats = {
      papersShared: 0,
    };

    try {
      // Fetch current stats from the API to get the latest paper count
      const response = await axios.get(
        `${PORTAL_API_URL}/api/debug/discord-stats/${guildId}?apiKey=${API_KEY}`
      );
      if (
        response.data &&
        response.data.success &&
        response.data.discord &&
        response.data.discord.databaseStats
      ) {
        currentDatabaseStats = {
          papersShared: response.data.discord.databaseStats.papersShared || 0,
        };
        console.log(
          `[Discord Bot] Retrieved current database stats for guild ${guildId}: ${currentDatabaseStats.papersShared} papers`
        );
      }
    } catch (error) {
      console.error(
        `[Discord Bot] Failed to fetch current database stats for guild ${guildId}:`,
        error
      );
      // Continue anyway, we'll just use our local stats
    }

    const stats = guildStats.get(guildId) || {
      messageCount: 0,
      papersShared: 0,
      qualityScore: 50,
      lastMessageTimestamp: new Date(),
      activeUsers: new Set<string>(),
    };

    // Prepare payload - use database paper count if available
    const payload = {
      event: eventType,
      guildId: guild.id,
      memberCount: guild.memberCount,
      messagesCount: stats.messageCount,
      papersShared: currentDatabaseStats.papersShared, // Use database value instead of in-memory
      qualityScore: Math.round(stats.qualityScore),
      activeUsers: stats.activeUsers.size,
      apiKey: API_KEY,
    };

    // Determine endpoint based on event type
    let endpoint;
    if (eventType === 'guildCreate') {
      endpoint = '/discord/bot-installed';
      console.log(`Notifying API of bot installation in ${guild.name}`);
    } else {
      endpoint = '/discord/stats-update';
      console.log(`Updating stats for ${guild.name}: ${JSON.stringify(payload)}`);
    }

    // Send to API
    const response = await axios.post(`${PORTAL_API_URL}${endpoint}`, payload);
    console.log(`API response (${eventType}):`, response.data);

    // Update in-memory storage with database paper count to keep in sync
    if (eventType === 'stats_update' && currentDatabaseStats.papersShared > 0) {
      const guildStat = guildStats.get(guildId);
      if (guildStat) {
        // Only update if database count is higher (never decrease)
        if (currentDatabaseStats.papersShared > guildStat.papersShared) {
          guildStat.papersShared = currentDatabaseStats.papersShared;
          console.log(
            `[Discord Bot] Updated in-memory paper count for guild ${guildId} to match database: ${guildStat.papersShared}`
          );
        }
      }
    }

    // Also notify the bot events endpoint for internal processing
    await axios.post(`${PORTAL_API_URL}/api/discord/bot-events`, payload);
  } catch (error) {
    console.error(`Failed to notify Portal API for guild ${guildId}:`, error);
  }
}

/**
 * Update stats for all guilds
 */
async function updateAllGuildStats(): Promise<void> {
  console.log('Running scheduled guild stats update...');

  for (const [guildId, stats] of guildStats.entries()) {
    try {
      await notifyPortalAPI(guildId, 'stats_update');
    } catch (error) {
      console.error(`Error updating stats for guild ${guildId}:`, error);
    }
  }

  console.log('Scheduled update complete');
}

// Test function to validate PDF analysis for arXiv-style filenames
function testPdfAnalysis() {
  console.log('============ PDF ANALYSIS TEST CASES ============');

  // Test arXiv-style papers
  const testCases = [
    '2504.11091.pdf',
    'arXiv_2201.09876.pdf',
    '1903.07933.pdf',
    'smith_2022_quantum_algorithm.pdf',
    '10.1038_s41586-021-03819-2.pdf',
  ];

  for (const testFile of testCases) {
    const result = analyzeScientificPdf(testFile, 1.5 * 1024 * 1024); // Assume 1.5MB size
    console.log(
      `PDF Analysis for "${testFile}": confidence=${result.confidence}, isScientificPaper=${result.isScientificPaper}`
    );
    console.log(`- Reason: ${result.reason}`);
  }

  console.log('=================================================');
}

// Run the test on startup
testPdfAnalysis();

// Start the bot
client.login(DISCORD_BOT_TOKEN).catch((err) => {
  console.error('Failed to login to Discord:', err);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Bot shutting down, updating final stats...');
  await updateAllGuildStats();
  client.destroy();
  process.exit(0);
});

/**
 * Checks if a guild's metrics meet level-up requirements and triggers level advancement
 * This is called after significant events like paper detection or message threshold reached
 */
async function checkGuildLevelRequirements(guildId: string): Promise<void> {
  try {
    // Get guild stats from database via API
    const response = await axios.post(`${PORTAL_API_URL}/discord/check-level-requirements`, {
      guildId: guildId,
      apiKey: API_KEY,
      source: 'discord_bot',
      event: 'metrics_updated',
    });

    if (response.data?.levelUp) {
      console.log(
        `[Discord Bot] Level-up triggered for guild ${guildId} from level ${response.data.previousLevel} to ${response.data.newLevel}`
      );
    }
  } catch (error) {
    console.error('[Discord Bot] Error checking level requirements:', error);
  }
}

export { client };
