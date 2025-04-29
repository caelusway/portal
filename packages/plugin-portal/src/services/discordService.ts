import { Service, IAgentRuntime } from '@elizaos/core';
import {
  Client,
  GatewayIntentBits,
  Events,
  Guild,
  GuildMember,
  Message,
  TextChannel,
} from 'discord.js';
import { DiscordService as DBDiscordService, ProjectService } from '../utils/db';
// Assume these exist or stub as needed
import { analyzeScientificPdf, detectPaper } from '../utils/paperDetection';

// In-memory stats tracking
interface GuildStats {
  messageCount: number;
  papersShared: number;
  qualityScore: number;
  lastMessageTimestamp: Date;
  activeUsers: Set<string>;
}

export class DiscordService extends Service {
  public readonly capabilityDescription =
    'Tracks Discord community metrics and engagement for BioDAO onboarding';

  client: Client;
  private statsUpdateInterval: NodeJS.Timeout | null = null;
  private guildStats: Map<string, GuildStats> = new Map();
  private guildMessageHistory: Map<
    string,
    { userId: string; content: string; timestamp: Date; qualityScore: number }[]
  > = new Map();
  private processedMessageIdsByGuild: Record<string, Set<string>> = {};

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });
  }

  static async start(runtime: IAgentRuntime): Promise<DiscordService> {
    const service = new DiscordService(runtime);
    await service.init();
    return service;
  }

  async stop(): Promise<void> {
    if (this.statsUpdateInterval) clearInterval(this.statsUpdateInterval);
    await this.client.destroy();
  }

  private async init() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) throw new Error('DISCORD_BOT_TOKEN not set');
    this.registerEventHandlers();
    await this.client.login(token);
    console.log('[DiscordService] Bot logged in');
  }

  private registerEventHandlers() {
    this.client.once(Events.ClientReady, () => {
      console.log(`[DiscordService] Ready as ${this.client.user?.tag}`);
      this.scheduleStatsUpdates();
      // Initialize stats for all guilds
      this.client.guilds.cache.forEach((guild) => this.initializeGuildStats(guild));
    });

    this.client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
      const guild = member.guild;
      console.log(`[DiscordService] New member joined ${guild.name}: ${member.user.username}`);
      await this.updateStats(guild.id);
      // Level-up logic: check requirements
      await this.checkLevelRequirements(guild.id);
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      if (message.author.bot || !message.guild) return;
      const guildId = message.guild.id;
      // Deduplication
      if (!this.processedMessageIdsByGuild[guildId])
        this.processedMessageIdsByGuild[guildId] = new Set();
      if (this.processedMessageIdsByGuild[guildId].has(message.id)) return;
      this.processedMessageIdsByGuild[guildId].add(message.id);
      // Paper detection
      const isSpam = this.isLowValueMessage(message.content);
      const hasPdfLink = /https?:\/\/[^\s]+\.pdf(\?[^\s]*)?/i.test(message.content);
      const hasAttachment = message.attachments.size > 0;
      let isPaper = false;
      if (hasAttachment) {
        for (const [, attachment] of message.attachments) {
          const filename = attachment.name?.toLowerCase() || '';
          if (filename.endsWith('.pdf')) {
            const paperAnalysis = analyzeScientificPdf(attachment.name || '', attachment.size);
            const isArxivPattern = attachment.name?.match(/^[0-9]{4}\.[0-9]{4,5}\.pdf$/i);
            if (isArxivPattern || paperAnalysis.isScientificPaper) {
              isPaper = true;
              try {
                await message.react('📚');
              } catch {}
              break;
            }
          }
        }
      }
      if (!isPaper) {
        if (hasPdfLink) {
          isPaper = true;
          try {
            await message.react('📚');
          } catch {}
        } else {
          isPaper = detectPaper(message.content, hasAttachment);
        }
      }
      if (isPaper) {
        await this.incrementPapersShared(guildId);
        // Log: trigger level-up/email/websocket as needed
        console.log(`[DiscordService] Paper detected in ${guildId}`);
        return;
      }
      if (!isSpam) {
        await this.incrementMessagesCount(guildId);
      }
      // Quality scoring
      this.updateMessageHistory(
        guildId,
        message.author.id,
        message.content,
        this.calculateMessageQuality(message.content)
      );
      this.evaluateMessageQuality(guildId);
    });
  }

  private scheduleStatsUpdates() {
    this.statsUpdateInterval = setInterval(
      () => {
        this.client.guilds.cache.forEach((guild) => this.updateStats(guild.id));
      },
      30 * 60 * 1000
    ); // Every 30 minutes
  }

  private async initializeGuildStats(guild: Guild) {
    // Fetch from DB
    const discordRecord = await DBDiscordService.getByServerId(guild.id);
    const dbMessages = discordRecord?.messagesCount || 0;
    const dbPapers = discordRecord?.papersShared || 0;
    const dbQuality = discordRecord?.qualityScore || 50;
    this.guildStats.set(guild.id, {
      messageCount: dbMessages,
      papersShared: dbPapers,
      qualityScore: dbQuality,
      lastMessageTimestamp: new Date(),
      activeUsers: new Set<string>(),
    });
    this.guildMessageHistory.set(guild.id, []);
  }

  private async updateStats(guildId: string) {
    // Fetch and update stats from DB
    const discordRecord = await DBDiscordService.getByServerId(guildId);
    if (!discordRecord) return;
    const stats = this.guildStats.get(guildId) || {
      messageCount: 0,
      papersShared: 0,
      qualityScore: 50,
      lastMessageTimestamp: new Date(),
      activeUsers: new Set<string>(),
    };
    stats.messageCount = discordRecord.messagesCount || 0;
    stats.papersShared = discordRecord.papersShared || 0;
    stats.qualityScore = discordRecord.qualityScore || 50;
    this.guildStats.set(guildId, stats);
  }

  private async incrementPapersShared(guildId: string) {
    const discordRecord = await DBDiscordService.getByServerId(guildId);
    if (!discordRecord) return;
    await DBDiscordService.updateStats(discordRecord.id, {
      papersShared: (discordRecord.papersShared || 0) + 1,
      updatedAt: new Date(),
    });
    await this.checkLevelRequirements(guildId);
  }

  private async incrementMessagesCount(guildId: string) {
    const discordRecord = await DBDiscordService.getByServerId(guildId);
    if (!discordRecord) return;
    await DBDiscordService.updateStats(discordRecord.id, {
      messagesCount: (discordRecord.messagesCount || 0) + 1,
      updatedAt: new Date(),
    });
    await this.checkLevelRequirements(guildId);
  }

  private async checkLevelRequirements(guildId: string) {
    // Fetch project and discord stats, check for level-up
    const discordRecord = await DBDiscordService.getByServerId(guildId);
    if (!discordRecord) return;
    const project = await ProjectService.getById(discordRecord.projectId);
    if (!project) return;
    // Example: Level 4 requirements
    if (
      project.level === 3 &&
      (discordRecord.memberCount || 0) >= 5 &&
      (discordRecord.papersShared || 0) >= 5 &&
      (discordRecord.messagesCount || 0) >= 50
    ) {
      // Level up
      await ProjectService.updateLevel(project.id, 4);
      // Log: trigger email/websocket as needed
      console.log(`[DiscordService] Project ${project.id} leveled up to 4!`);
    }
  }

  private isLowValueMessage(content: string): boolean {
    const normalizedContent = content.toLowerCase().trim();
    if (normalizedContent.length < 5) return true;
    const lowValuePatterns = [
      /^(hi|hey|hello|sup|yo|gm|good morning|good evening|good night|gn|bye|cya|see ya|lol|ok|okay|k|sure|yes|no|maybe|thanks|thx|ty|np|yw|welcome)$/i,
      /^(what'?s up|how are you|how's it going)$/i,
      /^(nice|cool|great|awesome|amazing|good|bad|sad|happy|lmao|lmfao|rofl|oof|rip|f)$/i,
      /^((?:ha){1,5})$/i,
      /^[👋👍👎❤️😂🙏]+$/u,
    ];
    for (const pattern of lowValuePatterns) {
      if (pattern.test(normalizedContent)) return true;
    }
    const wordCount = normalizedContent.split(/\s+/).filter((word) => word.length > 0).length;
    if (wordCount <= 2) return true;
    return false;
  }

  private updateMessageHistory(
    guildId: string,
    userId: string,
    content: string,
    qualityScore: number
  ) {
    if (!this.guildMessageHistory.has(guildId)) this.guildMessageHistory.set(guildId, []);
    const history = this.guildMessageHistory.get(guildId)!;
    history.push({ userId, content, timestamp: new Date(), qualityScore });
    if (history.length > 1000) history.shift();
  }

  private calculateMessageQuality(content: string): number {
    let score = 0;
    const length = content.length;
    score += Math.min(40, length / 5);
    if (content.includes('```')) score += 10;
    if (content.match(/\*\*.*\*\*/)) score += 5;
    if (content.match(/\[.*\]\(.*\)/)) score += 10;
    if (content.includes('\n\n')) score += 5;
    if (content.match(/\d+\./)) score += 10;
    if (content.match(/^>.*$/m)) score += 10;
    return Math.min(100, score);
  }

  private evaluateMessageQuality(guildId: string): void {
    const stats = this.guildStats.get(guildId);
    const messageHistory = this.guildMessageHistory.get(guildId);
    if (!stats || !messageHistory) return;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = messageHistory.filter((msg) => msg.timestamp > oneDayAgo);
    const qualityMessages = recentMessages.filter((msg) => msg.qualityScore > 30);
    const qualityPercentage =
      recentMessages.length > 0 ? (qualityMessages.length / recentMessages.length) * 100 : 0;
    if (recentMessages.length > 10 && qualityPercentage < 50) {
      stats.qualityScore = Math.max(30, stats.qualityScore * 0.9);
    }
    if (recentMessages.length > 10 && qualityPercentage > 80) {
      stats.qualityScore = Math.min(100, stats.qualityScore * 1.1);
    }
    this.guildStats.set(guildId, stats);
  }

  // Example: Send a message to a channel
  async sendMessage(content: string, channelId: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (channel && channel.isTextBased && channel.isTextBased()) {
      await (channel as TextChannel).send(content);
    }
  }

  // Example: Fetch server info (can be used by actions/providers)
  async fetchServerInfo(guildId: string) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return null;
    return {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
    };
  }
}
