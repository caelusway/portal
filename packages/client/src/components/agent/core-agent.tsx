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
  userId?: string;
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

// Add interface for chat messages from the server
interface ServerChatMessage {
  id?: string;
  content: string;
  isFromAgent: boolean;
  timestamp?: string | Date;
  actionTaken?: string;
}

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
      if (!content) return '';

      // Remove excessive line breaks
      content = content.replace(/\n{3,}/g, '\n\n');

      return content;
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
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
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

  // Add database methods
  const {
    getProjectByWallet,
    getChatSessionsByProjectId,
    getChatMessagesBySessionId,
    getOrCreateChatSession,
    createChatMessage,
  } = useDatabase();

  // Add all refs at the top of the component for better organization
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animatedMessageIdRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dataFetchedRef = useRef<boolean>(false);
  const refreshIntervalRef = useRef<any>(null);
  const connectionTimeoutRef = useRef<any>(null);
  const authTimeoutRef = useRef<any>(null);

  // State for scroll and auto-refresh
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const getDiscordStats = () => {};

  // Get embedded wallet
  const embeddedWallet = wallets?.find(
    (wallet: ConnectedWallet) => wallet.walletClientType === 'privy'
  );

  // Add missing NFT minting state
  const [isMintingNFT, setIsMintingNFT] = useState(false);
  const [mintingNFTType, setMintingNFTType] = useState<string | null>(null);

  // State for Discord stats and user level (for real-time sidebar updates)
  const [sidebarDiscordStats, setSidebarDiscordStats] = useState(discordStats);
  const [sidebarUserLevel, setSidebarUserLevel] = useState(level);

  // WebSocket connection and handlers
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());

  // Generate a unique ID for new messages
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // State for input value
  const [inputValue, setInputValue] = useState('');

  // Add loading state for WebSocket connection, authentication, and chat history
  const [wsLoading, setWsLoading] = useState(true);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(true);

  // Utility: Build authentication payload
  const buildAuthPayload = (user: any, walletAddress: string | null) => {
    return {
      type: 'auth',
      ...(walletAddress ? { wallet: walletAddress } : {}),
      ...(user?.id ? { privyId: user.id } : {}),
      ...(user?.email ? { email: user.email } : {}),
    };
  };

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

  // Utility: Get wallet address from user/wallets
  const getWalletAddress = (user: any, wallets: any, embeddedWallet: any): string | null => {
    if (embeddedWallet?.address) return embeddedWallet.address;
    if (user?.wallet?.address) return user.wallet.address;
    if (wallets && wallets.length > 0) return wallets[0].address;
    if (user?.wallet && typeof user.wallet === 'string') return user.wallet;
    return null;
  };

  // Derived state: is authentication info ready?
  const isAuthReady = !!(getWalletAddress(user, wallets, embeddedWallet) || user?.id);

  useEffect(() => {
    if (autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        refresh();
      }, 4000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  }, [autoRefreshEnabled]);

  // Send message to CoreAgent
  const sendMessage = async (content: string) => {
    if (!wsRef.current || !isAuthenticated || !content.trim()) return;
    // Compose message payload
    const message: WebSocketMessage = {
      type: 'message',
      content,
      ...(typeof projectId === 'string' ? { userId: projectId } : {}),
    };
    // Add the user message to the UI
    const newMessage = {
      id: generateId(),
      content: content,
      isFromAgent: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);
    wsRef.current.send(JSON.stringify(message));
  };

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

  // Update sidebar state in real time from WebSocket messages
  useEffect(() => {
    setSidebarDiscordStats(discordStats);
  }, [discordStats]);
  useEffect(() => {
    setSidebarUserLevel(level);
  }, [level]);

  // Update sidebar state from WebSocket events
  const handleWebSocketMessage = useCallback(
    (data: any) => {
      switch (data.type) {
        case 'auth_success':
          setIsAuthenticated(true);
          setProjectId(data.userId);
          setUserLevel(data.level || 1);
          setSidebarUserLevel(data.level || 1);
          sessionStorage.setItem('authAttempts', '0');
          toast({
            title: 'Connected',
            description: 'Authenticated with CoreAgent',
            duration: 2000,
          });
          break;
        case 'error':
          setIsAuthenticated(false);
          toast({
            title: 'Error',
            description: data.message || 'An error occurred',
            variant: 'destructive',
            duration: 5000,
          });
          break;
        case 'level_up':
          setUserLevel(data.newLevel || userLevel + 1);
          setSidebarUserLevel(data.newLevel || userLevel + 1);
          checkProgress();
          refresh();
          toast({
            title: 'Level Up!',
            description: data.message || 'You advanced a level!',
            duration: 5000,
          });
          break;
        case 'level':
          setUserLevel(data.level || userLevel);
          setSidebarUserLevel(data.level || userLevel);
          refresh();
          break;
        case 'nfts':
          refresh();
          break;
        case 'discord_info':
          if (data.discord) {
            setSidebarDiscordStats(data.discord);
            refresh();
          }
          break;
        case 'discord_bot_installed':
          if (data.discord) {
            setSidebarDiscordStats(data.discord);
            checkProgress();
            refresh();
          }
          break;
        case 'chat_history':
          if (data.messages && Array.isArray(data.messages)) {
            const formattedMessages = data.messages.map((msg: ServerChatMessage) => ({
              id: msg.id || generateId(),
              content: msg.content,
              isFromAgent: msg.isFromAgent,
              timestamp: new Date(msg.timestamp || Date.now()),
              isGuidance: msg.actionTaken === 'GUIDANCE',
            }));
            setMessages(formattedMessages);
            checkProgress();
            refresh();
          }
          break;
        case 'message':
          // Prevent duplicate messages
          const messageId = data.messageId || generateId();
          if (!processedMessageIds.has(messageId)) {
            setMessages((prev) => [
              ...prev,
              {
                id: messageId,
                content: data.content,
                isFromAgent: true,
                timestamp: new Date(),
                isGuidance: data.action === 'GUIDANCE',
              },
            ]);
            setProcessedMessageIds((prev) => new Set(prev).add(messageId));
            checkProgress();
            refresh();
          }
          setIsLoading(false);
          break;
        default:
          // Handle other types as needed
          break;
      }
    },
    [userLevel, processedMessageIds, refresh]
  );

  // --- WebSocket Setup ---
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectBaseDelay = 2000; // ms

  // Store latest user/wallets/embeddedWallet in refs for authentication
  const userRef = useRef(user);
  const walletsRef = useRef(wallets);
  const embeddedWalletRef = useRef(embeddedWallet);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);
  useEffect(() => {
    embeddedWalletRef.current = embeddedWallet;
  }, [embeddedWallet]);

  // WebSocket connection only on mount (or if URL changes)
  useEffect(() => {
    let ws;
    const API_URL = import.meta.env.VITE_PUBLIC_WS_URL || 'ws://localhost:3001';
    const wsUrl = API_URL;
    const connect = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setIsConnected(false);
      setIsAuthenticated(false);
      setWsLoading(true); // Set loading true when starting connection

      ws.onopen = () => {
        setIsConnected(true);
        setWsLoading(false); // Set loading false as soon as connected
        refresh();
        reconnectAttemptsRef.current = 0;
        if (connectionTimeoutRef.current) {
          window.clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setIsAuthenticated(false);
        wsRef.current = null;
        setWsLoading(true); // Set loading true when disconnected
        if (connectionTimeoutRef.current) {
          window.clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        if (authTimeoutRef.current) {
          window.clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        console.warn('WebSocket closed:', event);
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectBaseDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current += 1;
          setTimeout(connect, delay);
        } else {
          toast({
            title: 'WebSocket Disconnected',
            description: 'Unable to reconnect after several attempts. Please refresh the page.',
            variant: 'destructive',
            duration: 10000,
          });
        }
      };

      ws.onerror = (error) => {
        setIsConnected(false);
        setIsAuthenticated(false);
        wsRef.current = null;
        setWsLoading(true); // Set loading true on error
        console.error('WebSocket error:', error);
        toast({
          title: 'WebSocket Error',
          description: 'Could not connect to server. (Insufficient resources?)',
          variant: 'destructive',
          duration: 5000,
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      connectionTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          wsRef.current.close();
          wsRef.current = null;
          setIsConnected(false);
          setIsAuthenticated(false);
          setWsLoading(true); // Set loading true on timeout
          toast({
            title: 'Connection Timeout',
            description: 'Could not connect to server.',
            variant: 'destructive',
            duration: 5000,
          });
        }
      }, 15000);
    };
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (connectionTimeoutRef.current) window.clearTimeout(connectionTimeoutRef.current);
      if (authTimeoutRef.current) window.clearTimeout(authTimeoutRef.current);
    };
  }, []);

  // Authenticate only when websocket is open and auth info is ready
  useEffect(() => {
    if (
      isConnected &&
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      isAuthReady
    ) {
      authenticateWebSocket();
    }
  }, [isConnected, isAuthReady]);

  // --- Authentication ---
  const authenticateWebSocket = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const walletAddress = getWalletAddress(
      userRef.current,
      walletsRef.current,
      embeddedWalletRef.current
    );
    if (!walletAddress && !userRef.current?.id) {
      toast({
        title: 'Authentication Error',
        description: 'No wallet or user ID found.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }
    const payload = buildAuthPayload(userRef.current, walletAddress);
    wsRef.current.send(JSON.stringify(payload));
  }, []);

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

  // Load chat history when session ID changes
  useEffect(() => {
    if (!sessionId) return;
    setChatHistoryLoading(true);
    const loadChatHistory = async () => {
      try {
        const messages = await getChatMessagesBySessionId(sessionId);
        if (messages && Array.isArray(messages)) {
          const formattedMessages = messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            isFromAgent: msg.isFromAgent,
            timestamp: new Date(msg.timestamp || Date.now()),
            isGuidance: msg.actionTaken === 'GUIDANCE',
          }));
          setMessages(formattedMessages);
          refresh();
          setChatHistoryLoading(false);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    loadChatHistory();
  }, [sessionId, getChatMessagesBySessionId]);

  // Always scroll to bottom when chat history loads or messages change
  useEffect(() => {
    if (!chatHistoryLoading) {
      scrollToBottom();
    }
  }, [chatHistoryLoading, messages.length]);

  // Restore state and functions for sidebar and suggested messages
  const [showDetails, setShowDetails] = useState(() => {
    const savedPreference = localStorage.getItem('showDetailsSidebar');
    return savedPreference === null ? true : savedPreference === 'true';
  });
  const toggleSidebar = () => {
    const newValue = !showDetails;
    setShowDetails(newValue);
    localStorage.setItem('showDetailsSidebar', String(newValue));
  };

  const handleManualRefresh = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'get_nfts',
          userId: projectId,
          forceRefresh: true,
        })
      );
      wsRef.current.send(
        JSON.stringify({
          type: 'check_progress',
          timestamp: Date.now(),
          forceRefresh: true,
          currentLevel: userLevel,
        })
      );
      getDiscordStats();
      refresh();
    }
    toast({
      title: 'Refreshing Data',
      description: 'Updating your project information...',
      duration: 2000,
    });
  };

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

  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);

  // Prevent UI and WebSocket usage until ready and chat history is loaded (only on initial load)
  if (!project || !sessionId || !user || !isAtBottom) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/bioicon.png" alt="BioDAO" className="h-16 w-16 animate-pulse" />
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-primary">
              {wsLoading ? 'Connecting to CoreAgent...' : 'Loading chat history...'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {wsLoading
              ? 'Please wait while we establish a secure connection.'
              : 'Fetching your previous conversation...'}
          </p>
        </div>
      </div>
    );
  }

  // Restore helper functions for UI rendering
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

  const renderProgressMetrics = () => {
    if (!levelProgress) return null;
    return (
      <div className="space-y-4 mt-4">
        <h3 className="text-sm font-medium">Level {userLevel} Progress</h3>
        {Object.entries(levelProgress.progress || {}).map(([key, value]) => (
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

  const renderDiscordStats = () => {
    if (!sidebarDiscordStats) {
      return (
        <div className="rounded-md border p-4 mb-4">
          <h2 className="text-sm font-medium mb-2">Discord Community</h2>
          <p className="text-xs text-muted-foreground">No Discord server connected</p>
        </div>
      );
    }
    return (
      <div className="space-y-2 mt-2">
        {sidebarDiscordStats.serverName && (
          <p className="text-sm font-medium">{sidebarDiscordStats.serverName}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="border rounded-md p-2">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="text-sm font-medium">{sidebarDiscordStats.memberCount}</p>
          </div>
          <div className="border rounded-md p-2">
            <p className="text-xs text-muted-foreground">Messages</p>
            <p className="text-sm font-medium">{sidebarDiscordStats.messagesCount}</p>
          </div>
          <div className="border rounded-md p-2">
            <p className="text-xs text-muted-foreground">Papers</p>
            <p className="text-sm font-medium">{sidebarDiscordStats.papersShared}</p>
          </div>
          <div className="border rounded-md p-2">
            <p className="text-xs text-muted-foreground">Verified</p>
            <p className="text-sm font-medium">{sidebarDiscordStats.verified ? 'Yes' : 'No'}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => {
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

  const formatWalletAddress = (address: string | any): string => {
    const walletStr = typeof address === 'string' ? address : String(address);
    if (walletStr.length < 10) return walletStr;
    return `${walletStr.substring(0, 6)}...${walletStr.substring(walletStr.length - 4)}`;
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
                Level {sidebarUserLevel}
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
                    [...messages]
                      .sort(
                        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                      )
                      .map((message, index, sortedMessages) => {
                        const isLastMessage = index === sortedMessages.length - 1;
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
                        {sidebarUserLevel}
                      </span>
                      Current Level
                    </h4>

                    {levelProgress && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>Requirements for Level {sidebarUserLevel + 1}:</p>
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
