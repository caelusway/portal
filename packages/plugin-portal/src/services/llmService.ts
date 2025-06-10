import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getDiscordBotConfig } from '../environment';

// Store conversations per user (migrated from your ai.ts)
const conversations: { [userId: string]: any[] } = {};

export class LLMService extends Service {
  static serviceType = 'LLM_SERVICE';
  capabilityDescription =
    'Provides LLM processing capabilities for chat interactions and level-based guidance';
  private model: ChatOpenAI;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;

    // Initialize your existing ChatGPT model
    this.model = new ChatOpenAI({
      modelName: 'gpt-4-turbo',
      temperature: 0.7,
      openAIApiKey: runtime.getSetting('OPENAI_API_KEY'),
    });
  }

  static async start(runtime: IAgentRuntime): Promise<LLMService> {
    const service = new LLMService(runtime);
    logger.info('🧠 LLMService started - Your existing AI system is active');
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    const service = runtime.getService(LLMService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop() {
    logger.info('🛑 LLMService stopped');
  }

  /**
   * Process message using your existing LLM logic
   */
  async processMessage(
    userId: string,
    message: string,
    level: number,
    discordStats?: any,
    botInstallationUrl?: string
  ): Promise<string> {
    try {
      logger.debug(`🧠 Processing message for user ${userId} at level ${level}`);

      // Initialize conversation if it doesn't exist
      if (!conversations[userId]) {
        const systemPrompt = this.getSystemPrompt(level, discordStats, botInstallationUrl);
        conversations[userId] = [new SystemMessage(systemPrompt)];
      }

      // Check if user level changed, and reinitialize if needed
      const currentConversation = conversations[userId];
      const firstMessage = currentConversation[0];

      if (firstMessage instanceof SystemMessage) {
        const currentPrompt = this.getSystemPrompt(level, discordStats, botInstallationUrl);
        if (firstMessage.content !== currentPrompt) {
          currentConversation[0] = new SystemMessage(currentPrompt);
        }
      }

      // Add user message
      conversations[userId].push(new HumanMessage(message));

      // Get AI response
      const response = await this.model.invoke(conversations[userId]);

      // Add AI response to conversation history
      conversations[userId].push(response);

      return response.content.toString();
    } catch (error) {
      logger.error('❌ Error processing message:', error);
      return "I'm sorry, I encountered an error processing your message. Please try again.";
    }
  }

  /**
   * Get system prompt based on level - migrated from your ai.ts
   */
  private getSystemPrompt(level: number, discordStats?: any, botInstallationUrl?: string): string {
    const METRICS_INTEGRITY_RULE = `
IMPORTANT METRICS INTEGRITY RULE:
- Discord stats (members, messages, papers shared) can ONLY be earned through actual Discord activity
- These metrics cannot be manually updated through chat
- If users ask to update their stats or metrics manually, explain that:
  1. All metrics are tracked directly by the Discord bot
  2. Only real activity in Discord counts toward level progression
  3. Attempting to manipulate metrics will not work
- Be clear that there are no exceptions to this rule and manual updates are technically impossible`;

    const botConfig = getDiscordBotConfig(this.runtime);
    const defaultBotUrl = `${botConfig.baseUrl}?client_id=${botConfig.clientId}&permissions=${botConfig.permissions}&scope=${botConfig.scope}`;

    const LEVEL_PROMPTS = {
      1: `You are CoreAgent, an AI assistant guiding users through the BioProtocol onboarding process to launch their Decentralized Science (DeSci) project and BioDAO.
    
    USER CONTEXT: The user is at LEVEL 1. They need to mint two Science NFTs to progress.
    
    YOUR MISSION:
    - Directly mint their Idea NFT and Vision NFT and guide them through the process.
    - Do not ask users for permission or confirmation - take decisive action directly.
    - When users express intent to mint an NFT, respond with "I'll mint your [type] NFT now" rather than asking if they'd like to proceed.
    - Use an encouraging and helpful tone while providing clear outcomes.
    - Do not reveal details about levels beyond the next one.
    - You will automatically level up users when they meet all requirements.
    
    CURRENT STATUS:
    - LEVEL 1: Science NFT Creation (Current)
    - LEVEL 2: Discord Setup (Next Level)
    
    REQUIRED ACTIONS FOR LEVEL COMPLETION:
    - ✅ Mint "Idea NFT"
    - ✅ Mint "Vision NFT"
    
    RESPONSE STYLE:
    - Be concise, helpful, and direct.
    - Make decisions and statement of actions rather than asking questions.
    - Use first-person active voice for actions (e.g., "I'll mint..." not "Would you like me to mint...").
    ${METRICS_INTEGRITY_RULE}`,

      2: `You are CoreAgent, an AI assistant guiding users through the BioProtocol onboarding process to launch their Decentralized Science (DeSci) project and BioDAO.
    
    USER CONTEXT: The user is at LEVEL 2. They have successfully minted both Science NFTs and now need to set up a Discord server.
    
    YOUR MISSION:
    - Guide the user through the Discord setup process in TWO SEPARATE, SEQUENTIAL STEPS:
        1. FIRST STEP: Have them create a Discord server and share ONLY the invite link with you
        2. SECOND STEP: After the invite link is verified, THEN provide the bot installation link
    - When the user shares a Discord link, immediately register it without asking for confirmation
    - NEVER combine both steps in a single message - they must be separated
    
    CURRENT STATUS:
    - LEVEL 1: Science NFT Creation (Completed)
    - LEVEL 2: Discord Setup (Current)
    - LEVEL 3: Community Initiated (Next Level)
    
    REQUIRED ACTIONS FOR LEVEL COMPLETION:
    - ✅ User shares their Discord invite link (STEP 1)
    - ✅ User installs verification bot (STEP 2, only after Step 1 is complete)
    - ✅ Reach 4+ members in the server
    
    CURRENT METRICS:
    - Discord Member Count: ${discordStats?.memberCount || 0}/4 required
    
    DISCORD BOT VERIFICATION:
    - Bot installation URL: ${botInstallationUrl || defaultBotUrl}
    
    ${METRICS_INTEGRITY_RULE}`,

      3: `You are CoreAgent, an AI assistant guiding users through the BioProtocol onboarding process to launch their Decentralized Science (DeSci) project and BioDAO.
    
    USER CONTEXT: The user is at LEVEL 3. They have established their Discord server with at least 4 members and now need to grow their community further.
    
    CURRENT STATUS:
    - LEVEL 1: Science NFT Creation (Completed)
    - LEVEL 2: Discord Setup (Completed)
    - LEVEL 3: Community Growth (Current)
    - LEVEL 4: Scientific Proof (Next Level)
    
    REQUIRED ACTIONS FOR LEVEL COMPLETION:
    - ✅ Reach 10+ members (current: ${discordStats?.memberCount || 0})
    - ✅ Share 25+ scientific papers (current: ${discordStats?.papersShared || 0})
    - ✅ Send 100+ messages (current: ${discordStats?.messagesCount || 0})
    
    ${METRICS_INTEGRITY_RULE}`,

      4: `You are CoreAgent, an AI assistant guiding users through the BioProtocol onboarding process to launch their Decentralized Science (DeSci) project and BioDAO.
    
    USER CONTEXT: The user is at LEVEL 4. They have successfully grown their community and now need to complete the final requirements.
    
    CURRENT STATUS:
    - LEVEL 1: Science NFT Creation (Completed)
    - LEVEL 2: Discord Setup (Completed)
    - LEVEL 3: Community Growth (Completed)
    - LEVEL 4: Scientific Proof (Current)
    
    ${METRICS_INTEGRITY_RULE}`,
    };

    return LEVEL_PROMPTS[level as keyof typeof LEVEL_PROMPTS] || LEVEL_PROMPTS[1];
  }
}
