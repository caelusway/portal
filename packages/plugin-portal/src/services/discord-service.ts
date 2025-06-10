import { Service, IAgentRuntime, elizaLogger } from '@elizaos/core';
import {
  Client,
  GatewayIntentBits,
  Events,
  Guild,
  Message,
  TextChannel,
  GuildMember,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
  Attachment,
} from 'discord.js';
import { databaseService } from './database.js';
import OpenAI from 'openai';

// @ts-ignore
import pdfParse from 'pdf-parse';

// Types from portal-api
interface GuildStats {
  messageCount: number;
  papersShared: number;
  qualityScore: number;
  lastMessageTimestamp: Date;
  activeUsers: Set<string>;
}

interface PaperMetadata {
  url: string;
  title?: string;
  authors?: string;
  doi?: string;
  platform?: string;
}

interface MessageHistoryItem {
  userId: string;
  content: string;
  timestamp: Date;
  qualityScore: number;
}

interface UserMessageFrequency {
  lastMessages: Date[];
  penaltyFactor: number;
}

interface UserProfileData {
  userId: string;
  guildId: string;
  contributorType?: string;
  credentials: {
    linkedin?: string;
    github?: string;
    scholar?: string;
    orcid?: string;
    twitter?: string;
    other?: string;
  };
  description?: string;
  onboardingStep: number;
  lastInteraction: Date;
  isComplete: boolean;
}

export class DiscordService extends Service {
  static serviceType = 'DISCORD_SERVICE';
  capabilityDescription =
    'Provides Discord bot integration for BioDAO community tracking and engagement';

  private client: Client;
  private guildStats: Map<string, GuildStats> = new Map();
  private guildMessageHistory: Map<string, MessageHistoryItem[]> = new Map();
  private userMessageFrequency: Map<string, UserMessageFrequency> = new Map();
  private processedMessageIdsByGuild: Record<string, Set<string>> = {};
  private pdfTextCache = new Map<string, { text: string; filename: string }>();
  private openai?: OpenAI;

  // Configuration from portal-api
  private readonly PAPER_KEYWORDS = [
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

  private readonly PAPER_DOMAINS = [
    'doi.org',
    'arxiv.org',
    'nature.com',
    'sciencedirect.com',
    'science.org',
    'link.springer.com',
    'cell.com',
    'onlinelibrary.wiley.com',
    'pubs.acs.org',
    'journals.plos.org',
    'frontiersin.org',
    'tandfonline.com',
    'academic.oup.com',
    'cambridge.org',
    'elifesciences.org',
    'mdpi.com',
    'biorxiv.org',
    'medrxiv.org',
    'chemrxiv.org',
    'psyarxiv.com',
    'osf.io',
    'pubmed.ncbi.nlm.nih.gov',
    'ncbi.nlm.nih.gov',
    'core.ac.uk',
    'paperswithcode.com',
    'github.com',
    'researchgate.net',
    'jstor.org',
    'scholar.google.com',
    'pnas.org',
    'plos.org',
  ];

  private readonly MESSAGE_CONFIG = {
    SPAM_THRESHOLD: 30,
    MIN_QUALITY_LENGTH: 8,
    MAX_FREQUENCY_PER_USER: 5,
    SIMILAR_MESSAGE_THRESHOLD: 0.8,
    COOLDOWN_PERIOD_MS: 60000,
    QUALITY_CHECK_INTERVAL_MS: 10 * 60 * 1000,
    HISTORY_SIZE: 1000,
  };

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
      ],
    });

    // Initialize OpenAI if API key is available
    const openaiKey = runtime.getSetting('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    this.setupEventHandlers();
  }

  static async start(runtime: IAgentRuntime): Promise<DiscordService> {
    const service = new DiscordService(runtime);

    const discordToken = runtime.getSetting('DISCORD_BOT_TOKEN');
    if (!discordToken) {
      elizaLogger.warn('⚠️ DISCORD_BOT_TOKEN not found - Discord service will not connect');
      return service;
    }

    try {
      await service.client.login(discordToken);
      elizaLogger.info('🤖 Discord Service started and bot logged in');
    } catch (error) {
      elizaLogger.error('❌ Failed to login Discord bot:', error);
    }

    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(DiscordService.serviceType) as DiscordService;
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('🛑 Stopping Discord Service');
    if (this.client) {
      this.client.destroy();
    }
  }

  private setupEventHandlers(): void {
    // Guild Create Event
    this.client.on(Events.GuildCreate, async (guild: Guild) => {
      elizaLogger.info(`🎉 Bot added to guild: ${guild.name} (${guild.id})`);
      await this.initializeGuildStats(guild);
      await this.notifyPortalAPI(guild.id, 'guildCreate');
    });

    // Guild Member Add Event
    this.client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
      elizaLogger.info(`👋 New member joined: ${member.user.tag} in ${member.guild.name}`);
      await this.handleNewMember(member);
    });

    // Message Create Event
    this.client.on(Events.MessageCreate, async (message: Message) => {
      if (message.author.bot) return;
      await this.handleMessage(message);
    });

    // Interaction Create Event (Slash Commands)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this.handleSlashCommand(interaction);
    });

    // Ready Event
    this.client.on(Events.ClientReady, () => {
      elizaLogger.info(`🚀 Discord bot ready as ${this.client.user?.tag}`);
      this.registerSlashCommands();
    });
  }

  private async initializeGuildStats(guild: Guild): Promise<void> {
    try {
      // Check if Discord record exists in database
      let discordRecord = await databaseService.getDiscordByServerId(guild.id);

      if (!discordRecord) {
        elizaLogger.info(`Creating new Discord record for guild: ${guild.name}`);
        discordRecord = await databaseService.createOrUpdateDiscordByServerId({
          serverId: guild.id,
          serverName: guild.name,
          memberCount: guild.memberCount,
          botAdded: true,
          verified: false,
        });
      } else {
        // Update bot added status
        await databaseService.createOrUpdateDiscordByServerId({
          serverId: guild.id,
          serverName: guild.name,
          memberCount: guild.memberCount,
          botAdded: true,
        });
      }

      // Initialize guild stats
      this.guildStats.set(guild.id, {
        messageCount: discordRecord.messagesCount || 0,
        papersShared: discordRecord.papersShared || 0,
        qualityScore: discordRecord.qualityScore || 100,
        lastMessageTimestamp: new Date(),
        activeUsers: new Set(),
      });

      this.guildMessageHistory.set(guild.id, []);
      this.processedMessageIdsByGuild[guild.id] = new Set();

      elizaLogger.info(`✅ Guild stats initialized for ${guild.name}`);
    } catch (error) {
      elizaLogger.error(`❌ Failed to initialize guild stats for ${guild.name}:`, error);
    }
  }

  private async handleNewMember(member: GuildMember): Promise<void> {
    try {
      // Save member to database
      await this.saveDiscordMember(member);

      // Update member count in stats and database
      const stats = this.guildStats.get(member.guild.id);
      if (stats) {
        await databaseService.updateDiscordStatsByServerId(member.guild.id, {
          memberCount: member.guild.memberCount,
        });
      }

      // Send welcome DM (if configured)
      await this.sendWelcomeDM(member);

      elizaLogger.info(`✅ Processed new member: ${member.user.tag}`);
    } catch (error) {
      elizaLogger.error(`❌ Failed to handle new member ${member.user.tag}:`, error);
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      if (!message.guild) return; // Skip DMs for now

      const guildId = message.guild.id;

      // Skip if already processed
      if (this.processedMessageIdsByGuild[guildId]?.has(message.id)) {
        return;
      }

      // Mark as processed
      if (!this.processedMessageIdsByGuild[guildId]) {
        this.processedMessageIdsByGuild[guildId] = new Set();
      }
      this.processedMessageIdsByGuild[guildId].add(message.id);

      // Update message stats
      await this.updateMessageStats(message);

      // Check for papers
      await this.checkForPapers(message);

      // Handle commands
      if (message.content.startsWith('!biodao')) {
        await this.handleTextCommand(message);
      }
    } catch (error) {
      elizaLogger.error(`❌ Failed to handle message:`, error);
    }
  }

  private async updateMessageStats(message: Message): Promise<void> {
    const guildId = message.guild!.id;
    const stats = this.guildStats.get(guildId);

    if (!stats) return;

    // Update stats
    stats.messageCount++;
    stats.activeUsers.add(message.author.id);
    stats.lastMessageTimestamp = new Date();

    // Update database
    try {
      await databaseService.updateDiscordStatsByServerId(guildId, {
        messagesCount: stats.messageCount,
      });
    } catch (error) {
      elizaLogger.debug(`Could not update message stats in database: ${error.message}`);
    }

    elizaLogger.debug(
      `📊 Updated message stats for guild ${guildId}: ${stats.messageCount} messages`
    );
  }

  private async checkForPapers(message: Message): Promise<void> {
    const paperUrls = this.extractPaperUrls(message.content);

    if (paperUrls.length > 0) {
      const guildId = message.guild!.id;
      const stats = this.guildStats.get(guildId);

      if (stats) {
        stats.papersShared += paperUrls.length;

        // Update database
        await databaseService.updateDiscordStatsByServerId(guildId, {
          papersShared: stats.papersShared,
        });

        // Save papers to database
        for (const url of paperUrls) {
          const metadata = await this.extractPaperMetadata(url, message.content);
          await this.savePaperToDatabase(metadata, message);
        }

        elizaLogger.info(
          `📄 Found ${paperUrls.length} papers in message from ${message.author.tag}`
        );
      }
    }
  }

  private extractPaperUrls(content: string): string[] {
    const urls: string[] = [];
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = content.match(urlRegex) || [];

    for (const url of matches) {
      // Check if URL is from a known paper domain
      if (this.PAPER_DOMAINS.some((domain) => url.includes(domain))) {
        urls.push(url);
      }
    }

    return urls;
  }

  private async extractPaperMetadata(url: string, content?: string): Promise<PaperMetadata> {
    const metadata: PaperMetadata = { url };

    // Detect platform based on URL
    if (url.includes('arxiv.org')) {
      metadata.platform = 'arxiv';
      const arxivMatch = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/);
      if (arxivMatch) {
        metadata.doi = `arXiv:${arxivMatch[1]}`;
      }
    } else if (url.includes('nature.com')) {
      metadata.platform = 'nature';
    } else if (url.includes('science.org')) {
      metadata.platform = 'science';
    } else if (url.includes('cell.com')) {
      metadata.platform = 'cell';
    } else if (url.includes('biorxiv.org')) {
      metadata.platform = 'biorxiv';
    } else if (url.includes('medrxiv.org')) {
      metadata.platform = 'medrxiv';
    } else if (url.includes('pubmed') || url.includes('ncbi.nlm.nih.gov')) {
      metadata.platform = 'pubmed';
    } else if (url.includes('researchgate.net')) {
      metadata.platform = 'researchgate';
    } else if (url.includes('sciencedirect.com')) {
      metadata.platform = 'sciencedirect';
    } else if (url.includes('link.springer.com')) {
      metadata.platform = 'springer';
    } else if (url.includes('onlinelibrary.wiley.com')) {
      metadata.platform = 'wiley';
    } else if (url.includes('pubs.acs.org')) {
      metadata.platform = 'acs';
    } else if (url.includes('journals.plos.org')) {
      metadata.platform = 'plos';
    } else if (url.includes('frontiersin.org')) {
      metadata.platform = 'frontiers';
    } else if (url.includes('tandfonline.com')) {
      metadata.platform = 'taylor_francis';
    } else if (url.includes('academic.oup.com')) {
      metadata.platform = 'oxford';
    } else if (url.includes('cambridge.org')) {
      metadata.platform = 'cambridge';
    } else if (url.includes('elifesciences.org')) {
      metadata.platform = 'elife';
    } else if (url.includes('mdpi.com')) {
      metadata.platform = 'mdpi';
    } else if (url.includes('osf.io')) {
      metadata.platform = 'osf';
    } else if (url.includes('core.ac.uk')) {
      metadata.platform = 'core';
    } else if (url.includes('paperswithcode.com')) {
      metadata.platform = 'paperswithcode';
    } else if (url.includes('github.com')) {
      metadata.platform = 'github';
    } else if (url.includes('jstor.org')) {
      metadata.platform = 'jstor';
    } else if (url.includes('scholar.google.com')) {
      metadata.platform = 'google_scholar';
    } else if (url.includes('pnas.org')) {
      metadata.platform = 'pnas';
    } else if (url.includes('doi.org')) {
      metadata.platform = 'doi';
    } else if (url.toLowerCase().endsWith('.pdf')) {
      metadata.platform = 'pdf';
    }

    // Extract DOI
    const doiMatch = (url + ' ' + (content || '')).match(
      /(?:doi:|doi\.org\/|10\.\d{4,}\/)(10\.\d{4,}\/[\w\.\-\/\(\)]+)/i
    );
    if (doiMatch) {
      metadata.doi = doiMatch[1];
    }

    // Try to extract title from content if available
    if (content) {
      const titlePatterns = [
        /"([^"]{10,200})"/, // Quoted titles
        /title:\s*([^\n]{10,200})/i, // "title: ..."
        /paper:\s*([^\n]{10,200})/i, // "paper: ..."
      ];

      for (const pattern of titlePatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          metadata.title = match[1].trim();
          break;
        }
      }
    }

    return metadata;
  }

  private async savePaperToDatabase(metadata: PaperMetadata, message: Message): Promise<void> {
    try {
      // Get Discord record
      const discordRecord = await databaseService.getDiscordByServerId(message.guild!.id);
      if (!discordRecord) {
        elizaLogger.debug(`No Discord record found for guild ${message.guild!.id}`);
        return;
      }

      // Save paper to database
      await databaseService.createPaper({
        url: metadata.url,
        title: metadata.title,
        authors: metadata.authors,
        doi: metadata.doi,
        platform: metadata.platform,
        sharedBy: message.author.id,
        sharedAt: new Date(),
        discordId: discordRecord.id,
      });

      elizaLogger.debug(`💾 Saved paper to database: ${metadata.url}`);
    } catch (error) {
      elizaLogger.error(`❌ Failed to save paper to database:`, error);
    }
  }

  private async saveDiscordMember(member: GuildMember): Promise<void> {
    try {
      // Get Discord record
      const discordRecord = await databaseService.getDiscordByServerId(member.guild.id);
      if (!discordRecord) {
        elizaLogger.debug(`No Discord record found for guild ${member.guild.id}`);
        return;
      }

      // Save member to database
      await databaseService.createDiscordMember({
        userId: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
        guildId: member.guild.id,
        joinedAt: member.joinedAt || new Date(),
        discordId: discordRecord.id,
      });

      elizaLogger.debug(`💾 Saved Discord member: ${member.user.tag}`);
    } catch (error) {
      elizaLogger.error(`❌ Failed to save Discord member:`, error);
    }
  }

  private async sendWelcomeDM(member: GuildMember): Promise<void> {
    try {
      // Get Discord record to find associated project
      const discordRecord = await databaseService.getDiscordByServerId(member.guild.id);
      if (!discordRecord || !discordRecord.projectId) {
        elizaLogger.debug(`No project linked to Discord guild ${member.guild.id}`);
        return;
      }

      const project = await databaseService.getProjectById(discordRecord.projectId);
      if (!project) {
        elizaLogger.debug(`Project ${discordRecord.projectId} not found`);
        return;
      }

      const welcomeMessage = `
🎉 Welcome to ${member.guild.name}!

This is a BioDAO community for the project: **${project.projectName || project.fullName || 'Unnamed Project'}**

${project.projectDescription || 'Building the future of decentralized science!'}

You can contribute by:
• Sharing relevant research papers
• Participating in discussions
• Helping grow the community

Type \`!biodao help\` in the server for available commands.
            `;

      await member.send(welcomeMessage);
      elizaLogger.info(`📨 Sent welcome DM to ${member.user.tag}`);
    } catch (error) {
      elizaLogger.debug(`Could not send welcome DM to ${member.user.tag}: ${error.message}`);
    }
  }

  private async handleTextCommand(message: Message): Promise<void> {
    const args = message.content.split(' ');
    const command = args[1]?.toLowerCase();

    switch (command) {
      case 'help':
        await this.sendHelpMessage(message);
        break;
      case 'stats':
        await this.sendStatsMessage(message);
        break;
      case 'progress':
        await this.sendProgressMessage(message);
        break;
      default:
        await message.reply('Unknown command. Type `!biodao help` for available commands.');
    }
  }

  private async sendHelpMessage(message: Message): Promise<void> {
    const helpText = `
**BioDAO Bot Commands:**

\`!biodao help\` - Show this help message
\`!biodao stats\` - Show community statistics
\`!biodao progress\` - Show progress toward next level

**Slash Commands:**
\`/summarize\` - Summarize a research paper PDF
\`/upload\` - Upload a PDF for Q&A
\`/ask\` - Ask questions about uploaded PDFs

**How to contribute:**
• Share research papers from supported platforms
• Engage in meaningful discussions
• Help grow the community

**Supported paper platforms:**
ArXiv, Nature, Science, Cell, PubMed, bioRxiv, medRxiv, and many more!
        `;

    await message.reply(helpText);
  }

  private async sendStatsMessage(message: Message): Promise<void> {
    const guildId = message.guild!.id;
    const stats = this.guildStats.get(guildId);

    if (!stats) {
      await message.reply('Stats not available for this server.');
      return;
    }

    const statsText = `
**📊 Community Statistics:**

👥 **Members:** ${message.guild!.memberCount}
💬 **Messages:** ${stats.messageCount}
📄 **Papers Shared:** ${stats.papersShared}
⭐ **Quality Score:** ${stats.qualityScore.toFixed(1)}
🔥 **Active Users:** ${stats.activeUsers.size}
        `;

    await message.reply(statsText);
  }

  private async sendProgressMessage(message: Message): Promise<void> {
    try {
      const guildId = message.guild!.id;
      const discordRecord = await databaseService.getDiscordByServerId(guildId);

      if (!discordRecord || !discordRecord.projectId) {
        await message.reply(
          'Progress tracking not available for this server. Please link this Discord to a BioDAO project first.'
        );
        return;
      }

      const project = await databaseService.getProjectById(discordRecord.projectId);
      if (!project) {
        await message.reply('Project not found.');
        return;
      }

      const stats = this.guildStats.get(guildId);
      const memberCount = message.guild!.memberCount;
      const messagesCount = stats?.messageCount || 0;
      const papersShared = stats?.papersShared || 0;

      let progressText = `**🎯 Progress for ${project.projectName || project.fullName || 'Your Project'}:**\n\n`;

      // Level requirements (from your level system)
      if (project.level === 2) {
        progressText += `**Level 2 → Level 3 Requirements:**\n`;
        progressText += `👥 Members: ${memberCount}/4 ${memberCount >= 4 ? '✅' : '❌'}\n`;
        progressText += `🤖 Bot Installed: ✅\n\n`;
      } else if (project.level === 3) {
        progressText += `**Level 3 → Level 4 Requirements:**\n`;
        progressText += `👥 Members: ${memberCount}/10 ${memberCount >= 10 ? '✅' : '❌'}\n`;
        progressText += `📄 Papers: ${papersShared}/25 ${papersShared >= 25 ? '✅' : '❌'}\n`;
        progressText += `💬 Messages: ${messagesCount}/100 ${messagesCount >= 100 ? '✅' : '❌'}\n\n`;
      }

      progressText += `**Current Level:** ${project.level}\n`;
      progressText += `**Current Stats:**\n`;
      progressText += `• Members: ${memberCount}\n`;
      progressText += `• Messages: ${messagesCount}\n`;
      progressText += `• Papers: ${papersShared}`;

      await message.reply(progressText);
    } catch (error) {
      elizaLogger.error('❌ Failed to send progress message:', error);
      await message.reply('Failed to get progress information.');
    }
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const { commandName } = interaction;
    elizaLogger.info(`🔧 Processing slash command: ${commandName}`);

    try {
      switch (commandName) {
        case 'summarize':
          await this.handleSummarizeCommand(interaction);
          break;
        case 'upload':
          await this.handleUploadCommand(interaction);
          break;
        case 'ask':
          await this.handleAskCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command', ephemeral: true });
      }
    } catch (error) {
      elizaLogger.error(`❌ Error handling slash command ${commandName}:`, error);

      if (interaction.deferred || interaction.replied) {
        await interaction
          .followUp({
            content: 'There was an error processing your command.',
            ephemeral: true,
          })
          .catch(console.error);
      } else {
        await interaction
          .reply({
            content: 'There was an error processing your command.',
            ephemeral: true,
          })
          .catch(console.error);
      }
    }
  }

  private async handleSummarizeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!this.openai) {
      await interaction.reply({
        content: 'OpenAI API key not configured. PDF summarization is not available.',
        ephemeral: true,
      });
      return;
    }

    try {
      const file = interaction.options.getAttachment('file');

      // Validate PDF file
      let isPdf = false;
      if (file && file.url) {
        const urlLower = file.url.toLowerCase();
        const urlParts = urlLower.split('?');
        if (urlParts[0].endsWith('.pdf')) {
          isPdf = true;
        }
      }

      if (!isPdf) {
        await interaction.reply({ content: 'Please upload a valid PDF file.', ephemeral: true });
        return;
      }

      // Defer the reply
      await interaction.deferReply();

      // Download and parse PDF
      const response = await fetch(file!.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const data = await pdfParse(Buffer.from(buffer));

      // Truncate if too long
      let text = data.text;
      const MAX_TEXT_LENGTH = 6000;
      if (text.length > MAX_TEXT_LENGTH) {
        text = text.slice(0, MAX_TEXT_LENGTH) + '\n... (content truncated)';
      }

      // Summarize with OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a scientific research assistant. Summarize the following scientific paper and provide key insights, main findings, and any notable limitations or future directions. Keep it concise and under 1500 characters.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 400,
        temperature: 0.3,
      });

      let summary = completion.choices[0]?.message?.content?.trim();
      if (!summary) {
        summary = "Sorry, I couldn't generate a summary for this document.";
      }

      // Ensure Discord character limit
      const DISCORD_MAX_LENGTH = 2000;
      if (summary.length > DISCORD_MAX_LENGTH) {
        summary = summary.slice(0, DISCORD_MAX_LENGTH - 20) + '... (summary truncated)';
      }

      await interaction.editReply(`📄 **PDF Summary:**\n\n${summary}`);
    } catch (error) {
      elizaLogger.error('❌ Error in summarize command:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Sorry, an error occurred while summarizing the PDF.');
      } else {
        await interaction.reply({
          content: 'Sorry, an error occurred while summarizing the PDF.',
          ephemeral: true,
        });
      }
    }
  }

  private async handleUploadCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const file = interaction.options.getAttachment('file');

      // Validate PDF file
      let isPdf = false;
      if (file && file.url) {
        const urlLower = file.url.toLowerCase();
        const urlParts = urlLower.split('?');
        if (urlParts[0].endsWith('.pdf')) {
          isPdf = true;
        }
      }

      if (!isPdf) {
        await interaction.reply({ content: 'Please upload a valid PDF file.', ephemeral: true });
        return;
      }

      // Defer the reply
      await interaction.deferReply({ ephemeral: true });

      // Download and parse PDF
      const response = await fetch(file!.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const data = await pdfParse(Buffer.from(buffer));

      // Store in cache for Q&A
      this.pdfTextCache.set(interaction.user.id, {
        text: data.text,
        filename: file!.name,
      });

      await interaction.editReply(
        `✅ PDF "${file!.name}" uploaded successfully! You can now use \`/ask\` to ask questions about it.`
      );
    } catch (error) {
      elizaLogger.error('❌ Error in upload command:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Sorry, an error occurred while uploading the PDF.');
      } else {
        await interaction.reply({
          content: 'Sorry, an error occurred while uploading the PDF.',
          ephemeral: true,
        });
      }
    }
  }

  private async handleAskCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!this.openai) {
      await interaction.reply({
        content: 'OpenAI API key not configured. PDF Q&A is not available.',
        ephemeral: true,
      });
      return;
    }

    const question = interaction.options.getString('question', true);

    try {
      // Defer the reply
      await interaction.deferReply({ ephemeral: true });

      // Check for cached PDF
      const cachedData = this.pdfTextCache.get(interaction.user.id);
      if (!cachedData) {
        await interaction.editReply('No PDF found for you. Please use `/upload` first.');
        return;
      }

      const { text: pdfText, filename } = cachedData;

      // Prepare context for LLM
      const MAX_CONTEXT_LENGTH = 6000;
      const context =
        pdfText.length > MAX_CONTEXT_LENGTH
          ? pdfText.slice(0, MAX_CONTEXT_LENGTH) + '\n... (context truncated)'
          : pdfText;

      // Ask OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant answering questions based ONLY on the provided text from a document named '${filename}'. If the answer is not found in the text, say "The answer is not found in the provided document text."`,
          },
          {
            role: 'user',
            content: `Document Text:\n---\n${context}\n---\n\nQuestion: ${question}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.2,
      });

      let answer = completion.choices[0]?.message?.content?.trim();
      if (!answer) {
        answer = "Sorry, I couldn't generate an answer based on the document.";
      }

      // Ensure Discord character limit
      const DISCORD_MAX_LENGTH = 2000;
      if (answer.length > DISCORD_MAX_LENGTH) {
        answer = answer.slice(0, DISCORD_MAX_LENGTH - 20) + '... (answer truncated)';
      }

      await interaction.editReply(`**Question:** ${question}\n\n**Answer:** ${answer}`);
    } catch (error) {
      elizaLogger.error('❌ Error in ask command:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Sorry, an error occurred while getting the answer.');
      } else {
        await interaction.reply({
          content: 'Sorry, an error occurred processing your request.',
          ephemeral: true,
        });
      }
    }
  }

  private async registerSlashCommands(): Promise<void> {
    try {
      const commands = [
        new SlashCommandBuilder()
          .setName('summarize')
          .setDescription('Summarize a research paper PDF')
          .addAttachmentOption((option) =>
            option.setName('file').setDescription('PDF file to summarize').setRequired(true)
          ),

        new SlashCommandBuilder()
          .setName('upload')
          .setDescription('Upload a PDF for Q&A')
          .addAttachmentOption((option) =>
            option.setName('file').setDescription('PDF file to upload').setRequired(true)
          ),

        new SlashCommandBuilder()
          .setName('ask')
          .setDescription('Ask a question about your uploaded PDF')
          .addStringOption((option) =>
            option
              .setName('question')
              .setDescription('Your question about the PDF')
              .setRequired(true)
          ),
      ];

      await this.client.application?.commands.set(commands);
      elizaLogger.info('✅ Slash commands registered');
    } catch (error) {
      elizaLogger.error('❌ Failed to register slash commands:', error);
    }
  }

  private async notifyPortalAPI(
    guildId: string,
    eventType: 'guildCreate' | 'stats_update'
  ): Promise<void> {
    try {
      elizaLogger.info(`📡 Discord event: ${eventType} for guild ${guildId}`);
    } catch (error) {
      elizaLogger.error('❌ Failed to notify portal API:', error);
    }
  }

  // Public methods for other services to use
  public async getGuildStats(guildId: string): Promise<GuildStats | undefined> {
    return this.guildStats.get(guildId);
  }

  public async updateGuildStats(guildId: string, updates: Partial<GuildStats>): Promise<void> {
    const stats = this.guildStats.get(guildId);
    if (stats) {
      Object.assign(stats, updates);
    }
  }

  public getClient(): Client {
    return this.client;
  }

  public async linkGuildToProject(guildId: string, projectId: string): Promise<void> {
    try {
      await databaseService.linkDiscordToProject(guildId, projectId);
      elizaLogger.info(`🔗 Linked Discord guild ${guildId} to project ${projectId}`);
    } catch (error) {
      elizaLogger.error(`❌ Failed to link guild to project:`, error);
      throw error;
    }
  }
}
