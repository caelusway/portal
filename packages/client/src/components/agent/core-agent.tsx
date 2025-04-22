import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../lib/use-auth';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Loader2,
  Send,
  X,
  MessageSquare,
  Settings,
  Bot,
  BrainCircuit,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  useDatabase,
  Project,
  Discord as DiscordType,
  NFT as NFTType,
} from '../../contexts/db-context';
import { cn } from '../../lib/utils';
import { ChatInput } from '../../components/ui/chat/chat-input';
import {
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
} from '../../components/ui/chat/chat-bubble';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { useWallets, ConnectedWallet } from '@privy-io/react-auth';
import { fetchDiscordStats, getDiscordProgress } from '../../lib/api/discord';
import { fetchCurrentLevel } from '../../lib/api/user-level';
import { useDashboardData } from '../../hooks/use-dashboard-data';
import { ref } from 'process';

// WebSocket message types
interface WebSocketMessage {
  type: string;
  content?: string;
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  content: string;
  isFromAgent: boolean;
  timestamp: Date;
  isGuidance?: boolean;
}

interface NFT {
  id: string;
  type: string;
  imageUrl?: string;
  mintedAt: Date;
  transactionHash?: string;
}

interface DiscordStats {
  memberCount: number;
  papersShared: number;
  messagesCount: number;
  verified: boolean;
  serverName?: string;
  serverId?: string;
  botAdded?: boolean;
}

interface LevelProgress {
  currentLevel: number;
  requirements: string[];
  progress: {
    [key: string]: {
      current: number;
      required: number;
      percent: number;
    };
  };
}

// Add typing animation CSS
const typingAnimationCSS = `
  @keyframes typing {
    0% { content: '.'; }
    33% { content: '..'; }
    66% { content: '...'; }
    100% { content: '.'; }
  }
  
  .typing-animation::after {
    content: '.';
    animation: typing 1.5s infinite;
  }

  /* Guidance message style - subtle left border only */
  .guidance-message {
    position: relative;
    border-left: 3px solid #3b82f6;
    padding-left: 0.5rem;
  }
  
  /* Guidance badge */
  .guidance-badge {
    display: inline-block;
    font-size: 10px;
    background-color: #3b82f6;
    color: white;
    padding: 1px 6px;
    border-radius: 4px;
    margin-bottom: 6px;
  }

  /* Markdown styles */
  .markdown-content {
    line-height: 1.6;
    color: var(--foreground, inherit);
  }
  
  .markdown-content h1 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .markdown-content h2 {
    font-size: 1.3rem;
    font-weight: bold;
    margin-top: 0.8rem;
    margin-bottom: 0.4rem;
  }
  
  .markdown-content h3 {
    font-size: 1.1rem;
    font-weight: bold;
    margin-top: 0.6rem;
    margin-bottom: 0.3rem;
  }
  
  .markdown-content p {
    margin-bottom: 0.75rem;
  }
  
  .markdown-content ul, .markdown-content ol {
    margin-left: 1.75rem;
    margin-bottom: 0.75rem;
    margin-top: 0.5rem;
    display: block;
    list-style-position: outside;
  }
  
  .markdown-content ul {
    list-style-type: disc !important;
  }
  
  .markdown-content ol {
    list-style-type: decimal !important;
  }
  
  .markdown-content li {
    display: list-item !important;
    margin-bottom: 0.3rem;
    padding-left: 0.25rem;
  }
  
  .markdown-content a {
    color: #3b82f6;
    text-decoration: underline;
    cursor: pointer;
    word-break: break-word;
    transition: color 0.15s ease;
  }
  
  .markdown-content a:hover {
    color: #2563eb;
    text-decoration: underline;
  }
  
  .markdown-content code {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.2rem 0.3rem;
    border-radius: 0.2rem;
    font-family: monospace;
    font-size: 0.9em;
  }
  
  .markdown-content blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin-left: 0;
    color: #6b7280;
  }
`;

const MemoizedMessageContent = React.memo(
  ({ message, shouldAnimate }: { message: ChatMessage; shouldAnimate: boolean }) => {
    // Function to normalize text content by removing excessive line breaks
    const normalizeContent = (content: string) => {
      // Replace 3 or more newlines with just 2 newlines (equivalent to one paragraph break)
      return content.replace(/\n{3,}/g, '');
    };

    // Function to detect and convert URLs to clickable links in plain text
    const linkifyContent = (content: string) => {
      // Regex to match URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return content.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">${url}</a>`;
      });
    };

    // Markdown component to render with consistent styling
    const MarkdownContent = ({ content }: { content: string }) => (
      <div className="markdown-content">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          remarkPlugins={[remarkGfm]}
          components={{
            // Customize link rendering
            a: ({ node, href, ...props }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer"
                {...props}
              />
            ),
            // Style ordered and unordered lists
            ul: ({ node, ...props }) => (
              <ul
                className="list-disc pl-6 my-2 block"
                style={{ listStylePosition: 'outside' }}
                {...props}
              />
            ),
            ol: ({ node, ...props }) => (
              <ol
                className="list-decimal pl-6 my-2 block"
                style={{ listStylePosition: 'outside' }}
                {...props}
              />
            ),
            // Style list items
            li: ({ node, ...props }) => (
              <li className="mb-1 ml-0" style={{ display: 'list-item' }} {...props} />
            ),
            // Style paragraphs
            p: ({ node, ...props }) => <p className="mb-3" {...props} />,
            // Style headings
            h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-2 mb-1" {...props} />,
          }}
        >
          {normalizeContent(content)}
        </ReactMarkdown>
      </div>
    );

    return (
      <div className="flex flex-col w-full">
        <ChatBubbleMessage {...(message.isFromAgent ? {} : { variant: 'sent' })} className={''}>
          <div className="py-2">
            {/* For agent messages, always use Markdown but wrap with AIWriter for animation */}
            {shouldAnimate && message.isFromAgent ? (
              <AIWriter>
                <MarkdownContent content={message.content} />
              </AIWriter>
            ) : message.isFromAgent ? (
              <MarkdownContent content={message.content} />
            ) : (
              <div
                dangerouslySetInnerHTML={{
                  __html: linkifyContent(normalizeContent(message.content)),
                }}
              />
            )}
          </div>
          <ChatBubbleTimestamp
            timestamp={new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        </ChatBubbleMessage>
      </div>
    );
  }
);

MemoizedMessageContent.displayName = 'MemoizedMessageContent';

// Create our own AIWriter component
const AIWriter = ({ children }: { children: React.ReactNode }) => {
  const [typedText, setTypedText] = useState<React.ReactNode>(null);

  useEffect(() => {
    // Just set the children directly
    setTypedText(children);
  }, [children]);

  return <div className="ai-writer">{typedText}</div>;
};

export function CoreAgent() {
  const { user } = useAuth();
  const { wallets } = useWallets(); // Get all connected wallets
  const { toast } = useToast();

  const { level, project, discordStats, nfts, sessionId, progress, error, refresh } =
    useDashboardData();

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLevel, setUserLevel] = useState(1);

  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [showDetails, setShowDetails] = useState(() => {
    const savedPreference = localStorage.getItem('showDetailsSidebar');
    return savedPreference === null ? true : savedPreference === 'true';
  });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastLevelCheck, setLastLevelCheck] = useState<number>(Date.now());
  const [levelPollingEnabled, setLevelPollingEnabled] = useState<boolean>(true);

  // Add states for NFT minting and image generation status
  const [isMintingNFT, setIsMintingNFT] = useState(false);
  const [mintingNFTType, setMintingNFTType] = useState<string | null>(null);

  // Add state for controlling data refresh
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Add all refs at the top of the component for better organization
  const refreshIntervalRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animatedMessageIdRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Add the data fetched ref here with the other refs
  const dataFetchedRef = useRef<boolean>(false);

  const {
    getProjectByWallet,
    getChatSessionsByProjectId,
    getChatMessagesBySessionId,
    getOrCreateChatSession,
    createChatMessage,
  } = useDatabase();

  // Get embedded wallet
  const embeddedWallet = wallets?.find(
    (wallet: ConnectedWallet) => wallet.walletClientType === 'privy'
  );

  // Scroll management
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 0);
  }, []);

  // Check if scroll is at bottom
  const checkIsAtBottom = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const bottom = scrollHeight - scrollTop - clientHeight < 10;
      setIsAtBottom(bottom);
    }
  }, []);

  // Update userLevel whenever level changes or when project data loads
  useEffect(() => {
    // Only update if level is available and valid
    if (level && typeof level === 'number') {
      setUserLevel(level);
    }
  }, [level]);

  useEffect(() => {
    if (projectId && userLevel) {
      getDiscordStats();
    }
  }, [projectId, userLevel]);

  // Load chat history when session ID changes
  useEffect(() => {
    if (!sessionId) return;

    const loadChatHistory = async () => {
      try {
        console.log('Loading chat history for session:', sessionId);
        const messages = await getChatMessagesBySessionId(sessionId);
        console.log('Retrieved messages:', messages);

        if (messages && Array.isArray(messages)) {
          const formattedMessages = messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            isFromAgent: msg.isFromAgent,
            timestamp: new Date(msg.timestamp || Date.now()),
            isGuidance: msg.actionTaken === 'GUIDANCE',
          }));

          console.log('Setting formatted messages:', formattedMessages.length);
          setMessages(formattedMessages);
          setTimeout(scrollToBottom, 100);
        } else {
          console.log('No messages received from API or invalid format');
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [sessionId, scrollToBottom, getChatMessagesBySessionId]);

  // Generate a unique ID for new messages
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add useEffect for polling mechanism
  useEffect(() => {
    // Only set up polling if authenticated and auto-refresh is enabled
    if (isAuthenticated && autoRefreshEnabled && wsRef.current) {
      console.log('Setting up data polling for sidebar');

      // Clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up polling for sidebar data every 10 seconds
      refreshIntervalRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('Refreshing sidebar data');
          fetchNFTs();
          getDiscordStats();
          checkProgress();
          fetchCurrentLevel(projectId || '');
        }
      }, 5000) as unknown as number;

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, autoRefreshEnabled]);

  // Also update WebSocket setup to refresh data when connection is re-established
  useEffect(() => {
    // Set up WebSocket connection
    const setupWebSocket = () => {
      const wsUrl = import.meta.env.VITE_PUBLIC_WS_URL || 'ws://localhost:3001';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);

        // Authenticate immediately when the connection opens
        if (user) {
          wsRef.current = ws;
          setTimeout(() => {
            authenticateUser();
          }, 100);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        // Try to reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      return ws;
    };

    // Set up WebSocket if user is authenticated
    if (user) {
      const ws = setupWebSocket();
      wsRef.current = ws;

      return () => {
        ws.close();
        wsRef.current = null;
      };
    }
  }, [user, project]);

  useEffect(() => {
    forceUpdate();
    checkProgress();
    fetchCurrentLevel(projectId || '');
  }, [autoRefreshEnabled, userLevel, projectId]);

  const forceUpdate = React.useReducer(() => ({}), {})[1];

  // Authenticate user with the WebSocket server
  const authenticateUser = () => {
    if (!wsRef.current || !user || !embeddedWallet) return;

    // Prefer embedded wallet address if available
    const walletAddress = embeddedWallet.address;

    const authPayload: WebSocketMessage = {
      type: 'auth',
      wallet: walletAddress,
      privyId: user.id,
    };

    console.log('Authenticating with wallet:', walletAddress);
    wsRef.current.send(JSON.stringify(authPayload));
  };

  const saveLoadingError = (error: any) => {
    console.error('Error in WebSocket operation:', error);
    setIsLoading(false); // Ensure loading is reset on error
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = async (data: any) => {
    console.log('WebSocket message received:', data);

    switch (data.type) {
      case 'auth_success':
        setIsAuthenticated(true);
        setUserLevel(data.level || 1);
        setProjectId(data.userId);

        // No need to load chat history here since we do it in loadProjectData
        if (data.userId) {
          console.log('Auth success for user:', data.userId);

          // Now, load data immediately on auth success
          console.log('Initiating data fetch for authenticated user');

          // First, fetch Discord stats via REST API
          const fetchDiscordStatsAsync = async () => {
            try {
              console.log('Fetching Discord stats for project:', data.userId);
              const stats = await fetchDiscordStats(data.userId);
              if (stats) {
                refresh();
                console.log('Discord stats set successfully');
              }
            } catch (error) {
              console.error('Error fetching Discord stats:', error);
            }
          };

          // Execute the Discord stats fetch
          fetchDiscordStatsAsync();

          // Then, after a short delay, request NFTs via WebSocket
          setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              try {
                console.log('Requesting NFTs via WebSocket');
                wsRef.current.send(JSON.stringify({ type: 'get_nfts' }));

                // After another delay, check progress
                setTimeout(() => {
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    try {
                      console.log('Checking progress via WebSocket');
                      wsRef.current.send(JSON.stringify({ type: 'check_progress' }));
                      fetchCurrentLevel(projectId || '');
                      checkProgress();
                    } catch (error) {
                      console.error('Error checking progress:', error);
                    }
                  }
                }, 500);
              } catch (error) {
                console.error('Error requesting NFTs:', error);
              }
            }
          }, 300);
        }
        break;

      case 'message':
        const newAgentMessage = {
          id: generateId(),
          content: data.content,
          isFromAgent: true,
          timestamp: new Date(),
          isGuidance: data.action === 'GUIDANCE',
        };

        // Set this message as the one to animate
        animatedMessageIdRef.current = newAgentMessage.id;

        addMessage(newAgentMessage);
        setIsLoading(false);

        // Check for NFT minting indications in the message
        if (
          data.content.includes('mint your Idea NFT') ||
          data.content.includes('minting an Idea NFT')
        ) {
          setIsMintingNFT(true);
          setMintingNFTType('idea');
        } else if (
          data.content.includes('mint your Vision NFT') ||
          data.content.includes('minting a Vision NFT')
        ) {
          setIsMintingNFT(true);
          setMintingNFTType('vision');
        }

        // If this message contains Discord data, update the Discord stats
        if (data.discord) {
          console.log('Received Discord data with message:', data.discord);
          refresh();
        }

        // If this is a bot-added message, refresh Discord stats
        if (data.action === 'BOT_ADDED') {
          console.log('Bot was added to Discord server, refreshing stats');

          // Add a slight delay to allow the server to update the database
          setTimeout(() => {
            getDiscordStats();

            // Also check if we should level up
            checkProgress();
          }, 1000);

          // Show a toast notification for additional visibility
          toast({
            title: '🎉 Discord Bot Added!',
            description: 'Your Discord server is now verified and tracking has begun.',
            variant: 'default',
            duration: 8000,
          });
        }

        // If mentions Discord registration or setup, try to refresh stats
        if (
          data.content.includes('Discord server') ||
          data.content.includes('discord server') ||
          data.content.includes('registered your Discord')
        ) {
          console.log('Message mentions Discord - refreshing stats');
          setTimeout(() => {
            getDiscordStats();
          }, 1000);
        }

        // Save message to database if we have a session
        if (sessionId) {
          try {
            createChatMessage(sessionId, data.content, true);
          } catch (error) {
            console.error('Error saving agent message:', error);
          }
        } else {
          console.error('Cannot save agent message: No session ID available');
        }
        break;

      case 'level_up':
        console.log('[CoreAgent] Level-up WebSocket message received:', data);

        // Use an IIFE to handle the async operation
        (async () => {
          try {
            if (projectId) {
              const currentLevel = await fetchCurrentLevel(projectId);
              if (currentLevel !== null && currentLevel !== userLevel) {
                console.log(
                  `[CoreAgent] Level change detected from WebSocket: ${userLevel} → ${currentLevel}`
                );

                // Update level state immediately
                setUserLevel(currentLevel);

                // Use toast to clearly indicate level change to user
                toast({
                  title: '🚀 Level Up!',
                  description: `You've advanced to Level ${currentLevel}! The UI will refresh to show your new requirements.`,
                  variant: 'default',
                  duration: 8000,
                });

                // Refresh all data to update UI
                fetchNFTs();
                getDiscordStats();
                checkProgress();

                // Force refresh sidebar data
                setTimeout(() => {
                  handleManualRefresh();
                }, 500);

                // Set last level check
                setLastLevelCheck(Date.now());

                // Notify the server we received the level update
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'level_acknowledged',
                      previousLevel: userLevel,
                      newLevel: currentLevel,
                      timestamp: Date.now(),
                    })
                  );
                }
              }
            }
          } catch (error) {
            console.error('[CoreAgent] Error handling level_up message:', error);
          }
        })();
        break;

      case 'level_update':
        console.log('[CoreAgent] Level update WebSocket message received:', data);

        if (data.forceCheck) {
          // Force a fresh level check
          (async () => {
            if (projectId) {
              try {
                const currentLevel = await fetchCurrentLevel(projectId);
                if (currentLevel !== null) {
                  // Only update if the level actually changed
                  if (currentLevel !== userLevel) {
                    console.log(`[CoreAgent] Forced level update: ${userLevel} → ${currentLevel}`);
                    setUserLevel(currentLevel);

                    // Refresh data
                    fetchNFTs();
                    getDiscordStats();
                    checkProgress();
                  } else {
                    console.log('[CoreAgent] Forced level check found no change');
                  }
                }
              } catch (error) {
                console.error('[CoreAgent] Error in forced level check:', error);
              }
            }
          })();
        } else if (data.level && typeof data.level === 'number') {
          // Direct level update from server
          if (data.level !== userLevel) {
            console.log(`[CoreAgent] Direct level update: ${userLevel} → ${data.level}`);
            setUserLevel(data.level);

            // Refresh data
            fetchNFTs();
            getDiscordStats();
            checkProgress();
          }
        }
        break;

      case 'nfts':
        refresh();
        break;

      case 'discord_bot_installed':
        // When we get a dedicated bot installation event
        console.log('Received discord_bot_installed event:', data);

        // Update Discord stats with the new information
        if (data.discord) {
          refresh();
          // Fetch fresh Discord stats via REST API instead of setting from WebSocket
          fetchDiscordStats(projectId || '').then((stats) => {
            if (stats) {
              refresh();
            }
          });
        }

        // Show a toast notification
        toast({
          title: '🎉 Discord Bot Added!',
          description: 'Your Discord server is now verified and tracking has begun.',
          variant: 'default',
          duration: 5000,
        });

        // Refresh user progress right after a bot is installed
        setTimeout(() => {
          checkProgress();
        }, 1000);
        break;

      case 'progress':
        console.log('[CoreAgent] Progress update received:', data.progress);

        // Store the previous level to detect changes
        const prevLevel = levelProgress?.currentLevel || userLevel;

        // Update progress data
        setLevelProgress(data.progress);

        // If level changed, particularly to level 4, ensure UI updates properly
        if (data.progress && data.progress.currentLevel !== prevLevel) {
          console.log(
            `[CoreAgent] Level changed in progress data: ${prevLevel} -> ${data.progress.currentLevel}`
          );

          // Update user level state
          setUserLevel(data.progress.currentLevel);

          // If this is a level 3 to 4 transition, perform additional updates
          if (data.progress.currentLevel === 4 && prevLevel === 3) {
            console.log('[CoreAgent] Level 3 to 4 transition detected in progress data');

            // Show a toast notification
            toast({
              title: '🎉 Level 4 Unlocked!',
              description:
                "Congratulations! You've completed all requirements and unlocked Level 4!",
              variant: 'default',
              duration: 8000,
            });
          }
        }

        setUserLevel(data.progress.currentLevel);
        // Refresh NFTs and Discord stats to keep sidebar data in sync
        setTimeout(() => {
          fetchNFTs();
          getDiscordStats();
        }, 500);
        break;

      case 'nft_minted':
        // NFT has been successfully minted
        setIsMintingNFT(false);
        setMintingNFTType(null);

        // Refresh NFTs to show the new one
        fetchNFTs();

        setUserLevel(data.level);

        toast({
          title: '🎉 NFT Minted!',
          description: `Your ${data.nftType} NFT has been successfully minted.`,
          variant: 'default',
          duration: 5000,
        });
        break;

      case 'nfts_data':
        refresh();
        break;

      case 'error':
        // If there was an error during minting, reset the status
        if (isMintingNFT) {
          setIsMintingNFT(false);
          setMintingNFTType(null);
        }

        toast({
          title: 'Error',
          description: data.message || 'Something went wrong',
          variant: 'destructive',
          duration: 5000,
        });
        setIsLoading(false);
        break;

      case 'discord_stats':
        console.log('[CoreAgent] Received Discord stats update:', data);

        if (data.stats) {
          refresh();

          // If this is a level 3 user and they meet requirements, force a progress check
          // But let the server decide if they should level up
          if (
            userLevel === 3 &&
            data.stats.memberCount >= 10 &&
            data.stats.papersShared >= 25 &&
            data.stats.messagesCount >= 100
          ) {
            console.log(
              '[CoreAgent] Level 3 user appears to meet level 4 requirements - requesting server verification'
            );

            // Force a progress check without changing the level locally
            setTimeout(() => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'check_progress',
                    forceCheck: true,
                    timestamp: Date.now(),
                  })
                );
              }
            }, 500);
          }
        }
        break;

      case 'level_status':
        console.log('[CoreAgent] Level status WebSocket message received:', data);

        if (data.level && typeof data.level === 'number') {
          if (data.level !== userLevel) {
            console.log(
              `[CoreAgent] Server reported level: ${data.level}, local level: ${userLevel}`
            );

            // Update level state immediately
            setUserLevel(data.level);

            // Show toast notification
            toast({
              title: '🚀 Level Up!',
              description: `Your level is now ${data.level}!`,
              variant: 'default',
              duration: 5000,
            });

            // Refresh all data
            fetchNFTs();
            getDiscordStats();
            checkProgress();
          } else {
            console.log(`[CoreAgent] Server confirmed current level: ${data.level}`);
          }
        }

        if (data.requirements && data.progress) {
          // Update progress display with latest data from server
          setLevelProgress({
            currentLevel: data.level || userLevel,
            requirements: data.requirements,
            progress: data.progress,
          });
        }
        break;

      default:
        console.log('Unhandled message type:', data.type);
    }
  };

  // Send message to CoreAgent
  const sendMessage = async (content: string) => {
    if (!wsRef.current || !isAuthenticated || !content.trim()) return;

    // Check if we have a valid session ID and create one if needed
    if (!sessionId) {
      console.log('No session ID available, attempting to create one');

      try {
        if (!projectId) {
          console.error('Cannot create session: No project ID available');
          toast({
            title: 'Error',
            description: 'Cannot send message - please reload the page',
            variant: 'destructive',
            duration: 3000,
          });
          return;
        }

        // Create a new session for this project
        const newSession = await getOrCreateChatSession(projectId);
        if (newSession && newSession.id) {
          console.log('Created new chat session on-demand:', newSession.id);
          refresh();
          // Continue with sending the message now that we have a session
        } else {
          console.error('Failed to create new chat session');
          toast({
            title: 'Error',
            description: 'Failed to create chat session - please try again',
            variant: 'destructive',
            duration: 3000,
          });
          return;
        }
      } catch (error) {
        console.error('Error creating chat session:', error);
        toast({
          title: 'Error',
          description: 'Failed to create chat session - please try again',
          variant: 'destructive',
          duration: 3000,
        });
        return;
      }
    }

    // Now we should have a valid sessionId (either existing or newly created)
    // Double check to make sure
    if (!sessionId) {
      console.error('Still no session ID after creation attempt');
      toast({
        title: 'Error',
        description: 'Cannot send message - session creation failed',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    const message: WebSocketMessage = {
      type: 'message',
      content,
    };

    const newMessage = {
      id: generateId(),
      content: content,
      isFromAgent: false,
      timestamp: new Date(),
    };

    animatedMessageIdRef.current = newMessage.id;
    addMessage(newMessage);

    // Persist message to database
    try {
      createChatMessage(sessionId, content, false);
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    wsRef.current.send(JSON.stringify(message));
    setInputValue('');
    setIsLoading(true);
  };

  // Fetch user's NFTs
  const fetchNFTs = useCallback(() => {
    if (!projectId) return;

    console.log('Fetching NFTs for project:', projectId);
    try {
      // Access wsRef.current inside the callback to avoid dependency
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'get_nfts',
          })
        );
      }
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    }
  }, [projectId]);

  // Check user's progress
  const checkProgress = useCallback(() => {
    if (!projectId) return;

    console.log('[CoreAgent] Checking level progress for project:', projectId);
    try {
      // Access wsRef.current inside the callback to avoid dependency
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Add a timestamp to ensure the request is unique
        ws.send(
          JSON.stringify({
            type: 'check_progress',
            timestamp: Date.now(),
            currentLevel: userLevel, // Send current level to help server verification
          })
        );

        // Log that the progress check was sent
        console.log(`[CoreAgent] Progress check sent with current level: ${userLevel}`);
      }
    } catch (error) {
      console.error('[CoreAgent] Error checking progress:', error);
    }
  }, [projectId, userLevel]);

  // Get Discord stats
  const getDiscordStats = useCallback(async () => {
    if (!projectId) return;

    console.log('Fetching Discord stats for project:', projectId);
    try {
      const stats = await fetchDiscordStats(projectId);
      console.log('Discord stats fetched via API:', stats);

      if (stats) {
        refresh();
      } else {
        console.log('No Discord server connected for this project');
      }
    } catch (error) {
      console.error('Error fetching Discord stats:', error);
    }
  }, [projectId]);

  // Fetch the current level for a user
  const fetchCurrentLevel = useCallback(async (projectId: string): Promise<number | null> => {
    if (!projectId) return null;

    try {
      const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';
      console.log(`[fetchCurrentLevel] Fetching level for project ${projectId}...`);

      const response = await fetch(`${API_URL}/api/projects/${projectId}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[fetchCurrentLevel] No project found for ID: ${projectId}`);
          return null;
        }
        throw new Error(`Error fetching user level: ${response.statusText}`);
      }

      const project = await response.json();
      console.log(`[fetchCurrentLevel] Project data retrieved:`, project);

      if (project && typeof project.level === 'number') {
        return project.level;
      } else {
        console.warn(`[fetchCurrentLevel] Retrieved project has invalid level data:`, project);
        return null;
      }
    } catch (error) {
      console.error(`[fetchCurrentLevel] Error fetching level for ${projectId}:`, error);
      return null;
    }
  }, []);

  // Add a message to the chat
  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Set up scroll event listener
  useEffect(() => {
    const currentScrollRef = scrollRef.current;
    if (currentScrollRef) {
      currentScrollRef.addEventListener('scroll', checkIsAtBottom);
      return () => {
        currentScrollRef.removeEventListener('scroll', checkIsAtBottom);
      };
    }
  }, [checkIsAtBottom]);

  // Load user project and chat history on initial load
  useEffect(() => {
    if (!user || !isAuthenticated) {
      if (!isInitializing) setIsInitializing(true);
      return;
    }

    setIsInitializing(true);

    const loadProjectData = async () => {
      try {
        // Prefer embedded wallet address if available
        const walletAddress = embeddedWallet
          ? embeddedWallet.address
          : user.wallet && (typeof user.wallet === 'string' ? user.wallet : user.wallet.toString());

        // Ensure walletAddress is a string before proceeding
        if (!walletAddress) {
          console.error('No valid wallet address found');
          setIsInitializing(false);
          toast({
            title: 'Error',
            description: 'No valid wallet address found',
            variant: 'destructive',
          });
          return;
        }

        console.log('Loading project data for wallet:', walletAddress);
        const project = (await getProjectByWallet(walletAddress)) as Project;
        if (project) {
          console.log('Project loaded:', project.id);
          setUserLevel(project.level);
          setProjectId(project.id);

          // Use an IIFE to avoid the dependency on fetchAndUpdateUserLevel
          // We'll perform a manual level check when project data is first loaded
          (async () => {
            try {
              const currentLevel = await fetchCurrentLevel(project.id);
              if (currentLevel !== null && currentLevel !== project.level) {
                console.log(
                  `[CoreAgent] Initial level check found updated level: ${project.level} → ${currentLevel}`
                );
                setUserLevel(currentLevel);
              }
            } catch (error) {
              console.error('[CoreAgent] Error in initial level check:', error);
            }
          })();

          // Always get the existing session or create a new one if none exists
          try {
            console.log('Getting chat sessions for project:', project.id);
            // Get all chat sessions for this project
            const sessions = await getChatSessionsByProjectId(project.id);

            if (sessions && sessions.length > 0) {
              // Use the most recent session (first in the array)
              console.log('Found existing chat sessions:', sessions.length);
              console.log('Using session:', sessions[0].id);
              refresh();

              // Load chat history for this session
              await loadChatHistoryForSession(sessions[0].id);
            } else {
              // Create a new session if none exists
              console.log('No existing session found, creating a new one');
              const newSession = await getOrCreateChatSession(project.id);
              if (newSession && newSession.id) {
                console.log('New session created:', newSession.id);
                refresh();
                setMessages([]); // Clear any messages since this is a new session
              } else {
                console.error('Failed to create new chat session');
                toast({
                  title: 'Error creating session',
                  description: 'Could not create a new chat session',
                  variant: 'destructive',
                });
              }
            }
          } catch (error) {
            console.error('Error getting chat session:', error);
            toast({
              title: 'Session Error',
              description: 'There was a problem retrieving your chat history',
              variant: 'destructive',
            });
          }

          // Load Discord stats if available
          if (project.Discord) {
            refresh();
          }

          // Load NFTs if available
          if (project.NFTs && project.NFTs.length > 0) {
            refresh();
          }

          // Set initialization as complete after all data is loaded
          setIsInitializing(false);
        } else {
          console.log('No project found for wallet:', walletAddress);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('Error loading project data:', error);
        toast({
          title: 'Error',
          description: 'Could not load your project data',
          variant: 'destructive',
        });
        setIsInitializing(false);
      }
    };

    // Helper function to load chat history for a specific session
    const loadChatHistoryForSession = async (sessionId: string) => {
      try {
        console.log('Loading chat history for session:', sessionId);
        const historyMessages = await getChatMessagesBySessionId(sessionId);

        if (historyMessages && Array.isArray(historyMessages) && historyMessages.length > 0) {
          console.log('Loaded', historyMessages.length, 'messages from history');

          // Sort messages by timestamp to ensure correct order
          const sortedMessages = [...historyMessages].sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateA - dateB;
          });

          const formattedMessages = sortedMessages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            isFromAgent: msg.isFromAgent,
            timestamp: new Date(msg.timestamp || Date.now()),
            isGuidance: msg.actionTaken === 'GUIDANCE',
          }));

          setMessages(formattedMessages);
          setTimeout(scrollToBottom, 100);
          return true;
        } else {
          console.log('No messages found for session:', sessionId);
          setMessages([]);
          return false;
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        toast({
          title: 'History Error',
          description: 'Could not load your chat history',
          variant: 'destructive',
        });
        return false;
      }
    };

    loadProjectData();
    checkProgress();
    getDiscordStats();
  }, [user, isAuthenticated, wallets, embeddedWallet]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle textarea key press (Shift+Enter for new line, Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        sendMessage(inputValue);
      }
    }
  };

  // Generate suggested messages based on user level
  const getSuggestedMessages = (): string[] => {
    switch (userLevel) {
      case 1:
        return [
          "I'd like to mint my Idea NFT",
          'Can I mint my Vision NFT?',
          'What do I need to do to level up?',
        ];
      case 2:
        return [
          "Here's my Discord server: discord.gg/myserver",
          'How can I grow my Discord community?',
          'What are the requirements for Level up?',
        ];
      case 3:
        return [
          'How many more members do I need?',
          'How can I increase paper sharing?',
          'What are the requirements for Level up?',
        ];
      case 4:
        return [
          "I'd like to talk to the Bio team",
          'What should I prepare for the team call?',
          "What's next for my BioDAO?",
        ];
      default:
        return ['How can I proceed?', "What's my current status?"];
    }
  };

  // Render NFT cards
  const renderNFTCards = () => {
    if (!nfts || nfts.length === 0) {
      return <p className="text-sm text-muted-foreground">No NFTs minted yet</p>;
    }

    return (
      <div className="grid grid-cols-2 gap-4 mt-2">
        {nfts.map((nft: any) => (
          <div key={nft.id} className="border rounded-lg p-2 bg-card">
            {nft.imageUrl ? (
              <img
                src={
                  nft.imageUrl.startsWith('/')
                    ? `${import.meta.env.VITE_PUBLIC_API_URL}${nft.imageUrl}`
                    : nft.imageUrl
                }
                alt={`${nft.type} NFT`}
                className="w-full h-24 object-cover rounded-md mb-2"
              />
            ) : (
              <div className="w-full h-24 bg-muted flex items-center justify-center rounded-md mb-2">
                No Image
              </div>
            )}
            <p className="text-sm font-medium">
              {nft.type.charAt(0).toUpperCase() + nft.type.slice(1)} NFT
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(nft.mintedAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // Render progress metrics based on user level
  const renderProgressMetrics = () => {
    if (!levelProgress) return null;

    return (
      <div className="space-y-4 mt-4">
        <h3 className="text-sm font-medium">Level {userLevel} Progress</h3>

        {Object.entries(levelProgress.progress).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{key}</span>
              <span>
                {value.current}/{value.required}
              </span>
            </div>
            <Progress value={value.percent} className="h-2" />
          </div>
        ))}
      </div>
    );
  };

  // Render Discord stats
  const renderDiscordStats = () => {
    console.log('Rendering Discord stats with data:', discordStats);

    if (!discordStats) {
      return (
        <div className="rounded-md border p-4 mb-4">
          <h2 className="text-sm font-medium mb-2">Discord Community</h2>
          <p className="text-xs text-muted-foreground">No Discord server connected</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 mt-2">
        {discordStats.serverName && (
          <p className="text-sm font-medium">{discordStats.serverName}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="border rounded-md p-2">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="text-sm font-medium">{discordStats.memberCount}</p>
          </div>
          <div className="border rounded-md p-2">
            <p className="text-xs text-muted-foreground">Messages</p>
            <p className="text-sm font-medium">{discordStats.messagesCount}</p>
          </div>
          <div className="border rounded-md p-2">
            <p className="text-xs text-muted-foreground">Papers</p>
            <p className="text-sm font-medium">{discordStats.papersShared}</p>
          </div>
          <div className="border rounded-md p-2">
            <p className="text-xs text-muted-foreground">Verified</p>
            <p className="text-sm font-medium">{discordStats.verified ? 'Yes' : 'No'}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => {
            console.log('Manual Discord stats refresh clicked');
            getDiscordStats();
            toast({
              title: 'Refreshing Discord Stats',
              description: 'Getting the latest Discord metrics...',
              duration: 3000,
            });
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Discord Stats
        </Button>
      </div>
    );
  };

  // Format wallet address for display
  const formatWalletAddress = (address: string | any): string => {
    const walletStr = typeof address === 'string' ? address : String(address);
    if (walletStr.length < 10) return walletStr;
    return `${walletStr.substring(0, 6)}...${walletStr.substring(walletStr.length - 4)}`;
  };

  // Update UI to show loading state when initializing or when user is not connected
  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Please connect your wallet to chat with CoreAgent</p>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while initializing
  if (!project || !sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Card className="w-full max-w-2xl p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="size-10 border rounded-full">
                <AvatarImage src="/bioicon.png" />
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">CoreAgent</span>
                  <Badge variant={isConnected ? 'success' : 'destructive'} className="text-[10px]">
                    {isConnected ? 'Connected' : 'Disconnecting'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Loading your BioDAO data...</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div>
                <p className="font-medium">Loading your data</p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we set up your CoreAgent session...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Update showDetails toggle to save preference
  const toggleSidebar = () => {
    const newValue = !showDetails;
    setShowDetails(newValue);
    // Save preference to localStorage
    localStorage.setItem('showDetailsSidebar', String(newValue));
  };

  // Restore manual refresh function
  const handleManualRefresh = () => {
    console.log('Manual refresh requested');

    // Run all data fetching functions
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Get NFTs
      wsRef.current.send(
        JSON.stringify({
          type: 'get_nfts',
          forceRefresh: true,
        })
      );

      // Check progress
      wsRef.current.send(
        JSON.stringify({
          type: 'check_progress',
          timestamp: Date.now(),
          forceRefresh: true,
        })
      );

      // Get Discord stats through REST API
      getDiscordStats();
    }

    toast({
      title: 'Refreshing Data',
      description: 'Updating your project information...',
      duration: 2000,
    });
  };

  // Add a component to show minting status
  const MintingStatus = () => {
    if (!isMintingNFT) return null;

    return (
      <div className="fixed bottom-4 right-4 bg-background border border-primary/20 rounded-lg p-4 shadow-lg z-50 max-w-xs">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
          <div>
            <p className="font-medium">{`Minting your ${mintingNFTType} NFT...`}</p>
            <p className="text-xs text-muted-foreground">This may take a minute</p>
          </div>
        </div>
      </div>
    );
  };

  // Main component UI when everything is loaded
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: typingAnimationCSS,
        }}
      />
      <div className="flex flex-col w-full h-screen p-4">
        <Card className="flex flex-col h-full border-none rounded-lg">
          <CardHeader className="pb-3 flex flex-row items-center justify-between bg-card border-b">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border rounded-full">
                <AvatarImage src="/bioicon.png" />
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">CoreAgent</CardTitle>
                  <Badge variant={isConnected ? 'success' : 'destructive'} className="text-[10px]">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Your AI guide for building a BioDAO</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary text-primary-foreground">
                Level {userLevel}
              </Badge>
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                {showDetails ? <X size={18} /> : <Settings size={18} />}
              </Button>
            </div>
          </CardHeader>

          <div className="flex flex-grow overflow-hidden">
            <div className={cn('flex-grow overflow-hidden flex flex-col', showDetails && 'w-full')}>
              <ScrollArea className="flex-grow p-4" ref={scrollRef} onScroll={checkIsAtBottom}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-2" />
                      <p className="font-medium">No messages in this session</p>
                      <p className="text-sm mb-4">
                        Start a conversation with CoreAgent or reload your history
                      </p>
                      {isAuthenticated && sessionId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            if (sessionId) {
                              console.log('Manual reload of chat history');
                              getChatMessagesBySessionId(sessionId)
                                .then((historyMessages) => {
                                  if (
                                    historyMessages &&
                                    Array.isArray(historyMessages) &&
                                    historyMessages.length > 0
                                  ) {
                                    console.log(
                                      'Manually loaded',
                                      historyMessages.length,
                                      'messages'
                                    );

                                    // Sort messages by timestamp
                                    const sortedMessages = [...historyMessages].sort((a, b) => {
                                      const dateA = new Date(a.timestamp).getTime();
                                      const dateB = new Date(b.timestamp).getTime();
                                      return dateA - dateB;
                                    });

                                    const formattedMessages = sortedMessages.map((msg) => ({
                                      id: msg.id,
                                      content: msg.content,
                                      isFromAgent: msg.isFromAgent,
                                      timestamp: new Date(msg.timestamp || Date.now()),
                                      isGuidance: msg.actionTaken === 'GUIDANCE',
                                    }));
                                    setMessages(formattedMessages);
                                    setTimeout(scrollToBottom, 100);

                                    toast({
                                      title: 'Chat History Loaded',
                                      description: `Loaded ${formattedMessages.length} messages from your previous conversations.`,
                                    });
                                  } else {
                                    toast({
                                      title: 'No chat history found',
                                      description: 'You can start a new conversation now',
                                    });
                                  }
                                })
                                .catch((err) => {
                                  console.error('Error loading chat history:', err);
                                  toast({
                                    title: 'Error loading chat history',
                                    description:
                                      'There was an error loading your previous messages',
                                    variant: 'destructive',
                                  });
                                });
                            }
                          }}
                        >
                          <Loader2 className="mr-2 h-4 w-4" />
                          Reload Chat History
                        </Button>
                      )}
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const isLastMessage = index === messages.length - 1;
                      const shouldAnimate =
                        isLastMessage &&
                        message.isFromAgent &&
                        message.id === animatedMessageIdRef.current;

                      return (
                        <div
                          key={message.id}
                          className={`flex flex-col gap-1 p-1 ${message.isFromAgent ? 'justify-start' : 'justify-end'}`}
                        >
                          <ChatBubble
                            variant={message.isFromAgent ? 'received' : 'sent'}
                            className="flex flex-row items-end gap-2"
                          >
                            {message.isFromAgent && (
                              <Avatar className="size-8 border rounded-full select-none mb-2">
                                <AvatarImage src="/bioicon.png" />
                              </Avatar>
                            )}

                            <MemoizedMessageContent
                              message={message}
                              shouldAnimate={shouldAnimate}
                            />
                          </ChatBubble>
                        </div>
                      );
                    })
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <ChatBubble variant="received" className="flex flex-row items-end gap-2">
                        <Avatar className="size-8 border rounded-full select-none mb-2">
                          <AvatarImage src="/bioicon.png" />
                        </Avatar>
                        <ChatBubbleMessage>
                          <div className="flex gap-1 items-center justify-center py-2">
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0s]" />
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </ChatBubbleMessage>
                      </ChatBubble>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Suggested messages */}
              <div className="px-4 py-2 border-t">
                <div className="flex flex-wrap gap-2 mb-4">
                  {getSuggestedMessages().map((message, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setInputValue(message);
                        sendMessage(message);
                      }}
                      disabled={isLoading || !isAuthenticated}
                    >
                      {message}
                    </Button>
                  ))}
                </div>

                {/* Chat input */}
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="relative rounded-md border bg-card"
                >
                  <ChatInput
                    ref={inputRef}
                    onKeyDown={handleKeyDown}
                    value={inputValue}
                    onChange={({ target }) => setInputValue(target.value)}
                    placeholder={isLoading ? 'CoreAgent is typing...' : 'Type your message here...'}
                    className="min-h-12 resize-none rounded-md bg-card border-0 p-3 shadow-none focus-visible:ring-0"
                    disabled={isLoading || !isAuthenticated}
                  />
                  <div className="flex items-center p-3 pt-0">
                    <Button
                      disabled={isLoading || !isAuthenticated || !inputValue.trim()}
                      type="submit"
                      size="sm"
                      className="ml-auto gap-1.5 h-[30px]"
                    >
                      {isLoading ? (
                        <div className="flex gap-0.5 items-center justify-center">
                          <Loader2 className="size-3.5 mr-1 animate-spin" />
                        </div>
                      ) : (
                        <Send className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Updated sidebar with refresh button */}
            {showDetails && (
              <div className="w-72 border-l border-border flex-shrink-0 overflow-y-auto">
                <div className="sticky top-0 bg-background z-10 p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">Project Dashboard</h3>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleManualRefresh}
                        className="h-7 w-7"
                        title="Refresh dashboard data"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-7 w-7"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  {/* Level info */}
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center justify-center bg-primary/10 rounded-full w-5 h-5 text-xs font-semibold text-primary">
                        {userLevel}
                      </span>
                      Current Level
                    </h4>

                    {levelProgress && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>Requirements for Level {userLevel + 1}:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          {levelProgress.requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {renderProgressMetrics()}
                  </div>

                  {/* Discord stats */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Discord Status</h4>
                    {renderDiscordStats()}
                  </div>

                  {/* NFTs */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Your NFTs</h4>
                    {renderNFTCards()}
                  </div>

                  {/* Wallet info */}
                  <div className="text-xs text-muted-foreground pt-4 border-t">
                    <p>Wallet: {formatWalletAddress(embeddedWallet?.address)}</p>
                    <p className="mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
                    <div className="flex items-center mt-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRefreshEnabled}
                          onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                          className="h-3 w-3"
                        />
                        <span>Auto-refresh</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 rounded-full shadow-lg z-10"
          size="sm"
          variant="secondary"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      {/* Add the minting status indicator */}
      <MintingStatus />
    </>
  );
}
