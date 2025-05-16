import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useWallets, ConnectedWallet } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, RefreshCw, AlertCircle, Menu, Copy, Loader2, ArrowDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useDatabase } from '@/contexts/db-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from '@/components/ui/chat/chat-input';
import {
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
} from '@/components/ui/chat/chat-bubble';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { cn } from '@/lib/utils';

// Prefix for all coaching agent message types to prevent conflicts
const COACHING_PREFIX = 'coaching_';

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

  .markdown-content {
    line-height: 1.7;
    font-size: 0.9rem;
    color: var(--foreground, #111);
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    max-width: 100%;
  }

  .markdown-content h1,
  .markdown-content h2,
  .markdown-content h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0.6rem 0 0.4rem;
  }

  .markdown-content li {
    margin: 0.3rem 0;
  }

  .markdown-content ul,
  .markdown-content ol {
    margin-top: 0.2rem;
    margin-bottom: 0.8rem;
    margin-left: 1rem;
    margin-right: 1rem;
    padding-left: 1rem;
  }

  .markdown-content a {
    color: #3b82f6;
    text-decoration: underline;
    word-break: break-all;
  }

  .markdown-content code {
    background: #f4f4f5;
    padding: 0.2rem 0.25rem;
    border-radius: 0.2rem;
    font-family: monospace;
    font-size: 0.9em;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .markdown-content pre {
    background: #f4f4f5;
    padding: 0.5rem;
    border-radius: 0.2rem;
    overflow-x: auto;
    white-space: pre-wrap;
    max-width: 100%;
  }

  .markdown-content pre code {
    background: transparent;
    padding: 0;
    white-space: pre-wrap;
  }

  .markdown-content blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 0.6rem;
    color: #6b7280;
    margin: 0.3rem 0;
  }
`;

// Message Types
interface ChatMessage {
  id: string;
  content: string;
  isFromAgent: boolean;
  timestamp: Date;
  isGuidance?: boolean;
}

interface WebSocketMessage {
  type: string;
  content?: string;
  projectId?: string;
  sessionType?: string;
  sessionId?: string;
  [key: string]: any;
}

// Update MemoizedMessageContent to accept toast as a prop
const MemoizedMessageContent = React.memo(
  ({
    message,
    shouldAnimate,
    toast,
  }: {
    message: ChatMessage;
    shouldAnimate: boolean;
    toast: any;
  }) => {
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
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">${url}</a>`;
      });
    };

    // Move handleCopyMessage inside so it can use toast
    const handleCopyMessage = (content: string) => {
      if (navigator && navigator.clipboard) {
        navigator.clipboard.writeText(content).then(() => {
          toast({
            title: 'Copied!',
            description: 'Message copied to clipboard as markdown.',
            duration: 1500,
          });
        });
      }
    };

    // Markdown component to render with consistent styling
    const MarkdownContent = ({ content }: { content: string }) => (
      <div className="markdown-content break-words">
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
                className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer break-all"
                {...props}
              />
            ),
            // Style ordered and unordered lists
            ul: ({ node, ...props }) => (
              <ul
                className="list-disc pl-6 my-4 block"
                style={{ listStylePosition: 'outside' }}
                {...props}
              />
            ),
            ol: ({ node, ...props }) => (
              <ol
                className="list-decimal pl-6 my-4 block"
                style={{ listStylePosition: 'outside' }}
                {...props}
              />
            ),
            // Style list items
            li: ({ node, ...props }) => (
              <li className="mb-2 ml-0" style={{ display: 'list-item' }} {...props} />
            ),
            // Style paragraphs
            p: ({ node, ...props }) => <p className="mb-3 break-words" {...props} />,
            // Style headings
            h1: ({ node, ...props }) => (
              <h1 className="text-xl font-bold mt-4 mb-2 break-words" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-lg font-bold mt-3 mb-2 break-words" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-md font-bold mt-2 mb-2 break-words" {...props} />
            ),
            // Add better pre handling
            pre: ({ node, ...props }) => (
              <pre
                className="overflow-x-auto whitespace-pre-wrap max-w-full p-2 bg-gray-100 rounded my-2"
                {...props}
              />
            ),
          }}
        >
          {normalizeContent(content)}
        </ReactMarkdown>
      </div>
    );

    return (
      <div className="flex flex-col w-full">
        <ChatBubbleMessage
          {...(message.isFromAgent ? {} : { variant: 'sent' })}
          className="overflow-hidden"
        >
          <div className="py-2 break-words overflow-wrap">
            {/* For agent messages, always use Markdown but wrap with AIWriter for animation */}
            {shouldAnimate && message.isFromAgent ? (
              <AIWriter>
                <MarkdownContent content={message.content} />
              </AIWriter>
            ) : message.isFromAgent ? (
              <MarkdownContent content={message.content} />
            ) : (
              <div
                className="break-words overflow-wrap"
                dangerouslySetInnerHTML={{
                  __html: linkifyContent(normalizeContent(message.content)),
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 w-full justify-end">
            <ChatBubbleTimestamp
              timestamp={new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
            <button
              type="button"
              className="p-1 rounded hover:bg-muted focus:bg-muted"
              style={{ lineHeight: 0 }}
              onClick={() => handleCopyMessage(message.content)}
              aria-label="Copy message as markdown"
            >
              <Copy className="w-4 h-4 text-gray-400 hover:text-primary" />
            </button>
          </div>
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

export function CoachingAgent() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { wallets } = useWallets();
  const { level, project, discordStats, nfts, sessionId, progress, error, refresh } =
    useDashboardData({
      sessionType: 'coachingagent',
    });
  const { getOrCreateChatSession } = useDatabase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [wasEverConnected, setWasEverConnected] = useState<boolean>(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const connectionErrorTimeoutRef = useRef<any>(null);
  const [isProjectDataReady, setIsProjectDataReady] = useState<boolean>(false);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const animatedMessageIdRef = useRef<string | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const [reconnectTrigger, setReconnectTrigger] = useState<number>(0);

  // Get embedded wallet for authentication
  const embeddedWallet = wallets?.find(
    (wallet: ConnectedWallet) => wallet.walletClientType === 'privy'
  );

  // Generate unique ID for messages
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get wallet address from user or wallets
  const getWalletAddress = (user: any, wallets: any, embeddedWallet: any): string | null => {
    if (user?.wallet?.address) return user.wallet.address;
    if (embeddedWallet?.address) return embeddedWallet.address;
    if (wallets?.[0]?.address) return wallets[0].address;
    return null;
  };

  // Format and linkify content
  const normalizeContent = (content: string) => {
    if (!content) return '';
    return content.replace(/\\n/g, '\n').replace(/\n\n+/g, '\n\n').trim();
  };

  const linkifyContent = (content: string) => {
    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">${url}</a>`;
    });
  };

  // Copy message to clipboard
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied to clipboard',
      description: 'The message has been copied to your clipboard.',
      duration: 3000,
    });
  };

  // Markdown renderer component
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
              className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer break-all"
              {...props}
            />
          ),
          // Style ordered and unordered lists
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc pl-6 my-4 block"
              style={{ listStylePosition: 'outside' }}
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal pl-6 my-4 block"
              style={{ listStylePosition: 'outside' }}
              {...props}
            />
          ),
          // Style list items
          li: ({ node, ...props }) => (
            <li className="mb-2 ml-0" style={{ display: 'list-item' }} {...props} />
          ),
          // Style paragraphs
          p: ({ node, ...props }) => <p className="mb-3 break-words" {...props} />,
          // Style headings
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 break-words" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-bold mt-3 mb-2 break-words" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-md font-bold mt-2 mb-2 break-words" {...props} />
          ),
          // Add better pre handling
          pre: ({ node, ...props }) => (
            <pre
              className="overflow-x-auto whitespace-pre-wrap max-w-full p-2 bg-gray-100 rounded my-2"
              {...props}
            />
          ),
        }}
      >
        {normalizeContent(content)}
      </ReactMarkdown>
    </div>
  );

  // Update createWebSocketMessage to properly handle null sessionId
  const createWebSocketMessage = (type: string, data: any = {}) => {
    // For auth messages, use the format the server expects (without prefix)
    if (type === `${COACHING_PREFIX}auth`) {
      return {
        type: 'auth', // Server expects "auth" not "coaching_auth"
        sessionType: 'coachingagent',
        ...data,
      };
    }

    // For other messages, use our prefixed format and add sessionId if available
    return {
      type,
      sessionType: 'coachingagent',
      ...(sessionId ? { sessionId } : {}), // Only include if not null
      ...data,
    };
  };

  // Update the sendMessage function to set the animatedMessageIdRef:
  const sendMessage = async (content: string) => {
    if (!content.trim() || !isConnected) return false;

    try {
      setIsSending(true);

      // Add user message to UI
      const userMessage: ChatMessage = {
        id: generateId(),
        content,
        isFromAgent: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Send message via WebSocket
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        // Use the createWebSocketMessage helper with sessionId if available
        const messageData: any = { content };
        if (sessionId) {
          messageData.sessionId = sessionId;
        }

        websocketRef.current.send(
          JSON.stringify(createWebSocketMessage(`${COACHING_PREFIX}message`, messageData))
        );

        setInputValue('');
        return true;
      } else {
        console.error('WebSocket is not connected');
        toast({
          title: 'Connection Error',
          description: 'Unable to send message. Please try reconnecting.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle keyboard events in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Check when project data is ready
  useEffect(() => {
    if (project?.id) {
      console.log('Project data is ready:', project.id);
      setIsProjectDataReady(true);
    } else {
      setIsProjectDataReady(false);
    }
  }, [project]);

  // Handle session creation if no session exists
  useEffect(() => {
    if (!project?.id) return;

    const initializeSession = async () => {
      if (!sessionId) {
        console.log('No coaching session found, creating a new one');
        try {
          const newSession = await getOrCreateChatSession(project.id, 'coachingagent');
          console.log('Created new coaching session:', newSession);

          // Refresh data to get the new session ID
          refresh();
        } catch (error) {
          console.error('Error creating coaching session:', error);
          toast({
            title: 'Session Error',
            description: 'Could not create a new coaching session. Please refresh the page.',
            variant: 'destructive',
          });
        }
      }
    };

    initializeSession();
  }, [project?.id, sessionId, getOrCreateChatSession, refresh, toast]);

  // Update the WebSocket connection to specify the session type
  useEffect(() => {
    // Only attempt connection when we have authentication, project ID, and project data is confirmed ready
    if (!isAuthenticated || !isProjectDataReady || !project?.id) {
      console.log('Prerequisites not met for WebSocket connection:', {
        isAuthenticated,
        isProjectDataReady,
        projectId: project?.id,
      });
      return;
    }

    console.log('All prerequisites met, connecting to WebSocket with project ID:', project.id);

    const connect = () => {
      // Use the current project ID from the closure
      const currentProjectId = project.id;

      if (!currentProjectId) {
        console.error('Project ID missing before WebSocket connection');
        return;
      }

      // Close existing connection
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      setIsLoading(true);
      const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';
      const wsUrl = API_URL.replace(/^http/, 'ws');

      // Include projectId and sessionType as URL parameters for immediate authentication
      const wsEndpoint = `${wsUrl}/api/coaching/ws?projectId=${encodeURIComponent(currentProjectId)}&sessionType=coachingagent`;
      console.log(`Connecting to WebSocket at: ${wsEndpoint}`);

      try {
        const ws = new WebSocket(wsEndpoint);
        websocketRef.current = ws;

        ws.onopen = () => {
          console.log('Connected to Coaching Agent WebSocket');
          setIsConnected(true);
          setIsLoading(false);
          setWasEverConnected(true);

          // Clear any connection error timeout
          if (connectionErrorTimeoutRef.current) {
            clearTimeout(connectionErrorTimeoutRef.current);
            connectionErrorTimeoutRef.current = null;
          }

          // Authentication should be automatic with URL parameter, but send auth message as fallback
          console.log('Sending backup auth message with projectId:', currentProjectId);

          // Send authentication message immediately after connection using the correct format
          const authMessage = createWebSocketMessage(`${COACHING_PREFIX}auth`, {
            projectId: currentProjectId,
            sessionType: 'coachingagent',
          });
          ws.send(JSON.stringify(authMessage));
          console.log('Auth message sent:', authMessage);

          // Set up ping interval to keep the connection alive
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }

          // Send a ping every 30 seconds to prevent connection timeouts
          pingIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              console.log('Sending ping to keep connection alive');
              const pingMessage = createWebSocketMessage(`${COACHING_PREFIX}ping`, {});
              ws.send(JSON.stringify(pingMessage));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketMessage;
            console.log('Received WebSocket message:', data.type);

            // Map server message types to our prefixed types if needed
            let messageType = data.type;
            if (messageType === 'auth_success') {
              messageType = `${COACHING_PREFIX}auth_success`;
            } else if (messageType === 'error') {
              messageType = `${COACHING_PREFIX}error`;
            } else if (messageType === 'agent_typing') {
              messageType = `${COACHING_PREFIX}agent_typing`;
              // Directly handle typing indicator events for immediate UI feedback
              setIsTyping(data.isTyping || false);
            }

            switch (messageType) {
              case `${COACHING_PREFIX}auth_success`:
                console.log('Authentication successful with Coaching Agent');
                // Request chat history after successful authentication - use the backend's expected format
                ws.send(
                  JSON.stringify(
                    createWebSocketMessage(`${COACHING_PREFIX}get_chat_history`, {
                      projectId: currentProjectId,
                      sessionType: 'coachingagent',
                    })
                  )
                );
                break;

              case `${COACHING_PREFIX}auth_error`:
              case `${COACHING_PREFIX}error`:
                console.error('Server error:', data.message);
                toast({
                  title: data.type === 'auth_error' ? 'Authentication Error' : 'Server Error',
                  description: data.message || 'An error occurred',
                  variant: 'destructive',
                });

                // If it's an auth error, show reconnection notification
                if (data.message?.includes('auth')) {
                  console.log('Authentication error detected:', data.message);
                  toast({
                    title: 'Authentication Error',
                    description: 'Please use the reconnect button to try again.',
                    variant: 'destructive',
                    duration: 5000,
                  });
                }
                break;

              case `${COACHING_PREFIX}chat_history`:
                if (Array.isArray(data.messages)) {
                  const formattedMessages = data.messages.map((msg: any) => ({
                    id: msg.id || generateId(),
                    content: msg.content,
                    isFromAgent: msg.isFromAgent,
                    timestamp: new Date(msg.timestamp || Date.now()),
                  }));
                  setMessages(formattedMessages);
                }
                break;

              case `${COACHING_PREFIX}message`:
                if (data.content) {
                  const newMessage: ChatMessage = {
                    id: data.id || generateId(),
                    content: data.content,
                    isFromAgent: data.isFromAgent || false,
                    timestamp: new Date(data.timestamp || Date.now()),
                  };
                  setMessages((prev) => [...prev, newMessage]);
                  setIsTyping(false);

                  // Set the animated message ID if this is from the agent
                  if (newMessage.isFromAgent) {
                    animatedMessageIdRef.current = newMessage.id;
                  }
                }
                break;

              case `${COACHING_PREFIX}agent_typing`:
                console.log('Agent typing status changed:', data.isTyping);
                setIsTyping(data.isTyping || false);
                break;

              case `${COACHING_PREFIX}pong`:
                console.log('Received pong from server');
                break;

              default:
                // Handle other message types with our prefix
                if (
                  data.type.startsWith('coaching_') ||
                  ['message', 'chat_history', 'agent_typing'].includes(data.type)
                ) {
                  // Map to our expected format if needed
                  const mappedType = data.type.startsWith('coaching_')
                    ? data.type
                    : `${COACHING_PREFIX}${data.type}`;

                  const mappedData = {
                    ...data,
                    type: mappedType,
                  };

                  // Re-process with our expected type
                  handleWebSocketMessage(mappedData);
                } else {
                  console.log('Unhandled message type:', data.type);
                }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
          }
        };

        // Helper function to handle mapped message types
        const handleWebSocketMessage = (data: WebSocketMessage) => {
          switch (data.type) {
            case `${COACHING_PREFIX}chat_history`:
              if (Array.isArray(data.messages)) {
                const formattedMessages = data.messages.map((msg: any) => ({
                  id: msg.id || generateId(),
                  content: msg.content,
                  isFromAgent: msg.isFromAgent,
                  timestamp: new Date(msg.timestamp || Date.now()),
                }));
                setMessages(formattedMessages);
              }
              break;

            case `${COACHING_PREFIX}message`:
              if (data.content) {
                const newMessage: ChatMessage = {
                  id: data.id || generateId(),
                  content: data.content,
                  isFromAgent: data.isFromAgent || false,
                  timestamp: new Date(data.timestamp || Date.now()),
                };
                setMessages((prev) => [...prev, newMessage]);
                setIsTyping(false);

                // Set the animated message ID if this is from the agent
                if (newMessage.isFromAgent) {
                  animatedMessageIdRef.current = newMessage.id;
                }
              }
              break;

            case `${COACHING_PREFIX}agent_typing`:
              setIsTyping(data.isTyping || false);
              break;
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to coaching agent',
            variant: 'destructive',
          });
        };

        ws.onclose = (event) => {
          console.log(
            `WebSocket closed with code ${event.code}, reason: ${event.reason || 'No reason provided'}`
          );
          setIsConnected(false);
          setIsLoading(false);

          // Clean up any existing timers
          if (connectionErrorTimeoutRef.current) {
            clearTimeout(connectionErrorTimeoutRef.current);
          }

          // Show a message only if it wasn't an intentional close (code 1000)
          if (event.code !== 1000) {
            console.log('Connection closed, manual reconnect required');
            toast({
              title: 'Connection Closed',
              description: 'Click the refresh button to reconnect when ready.',
              duration: 5000,
            });
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setIsConnected(false);
        setIsLoading(false);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to coaching agent',
          variant: 'destructive',
        });
      }
    };

    connect();

    // Cleanup function
    return () => {
      if (connectionErrorTimeoutRef.current) {
        clearTimeout(connectionErrorTimeoutRef.current);
        connectionErrorTimeoutRef.current = null;
      }

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      if (websocketRef.current) {
        websocketRef.current.close(1000); // Use code 1000 for normal closure
      }
    };
  }, [isAuthenticated, isProjectDataReady, project, refresh, reconnectTrigger]);

  // Manual reconnect function
  const handleManualRefresh = () => {
    if (connectionErrorTimeoutRef.current) {
      clearTimeout(connectionErrorTimeoutRef.current);
      connectionErrorTimeoutRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close(1000); // Use code 1000 for normal closure
      websocketRef.current = null;
    }

    // Only reconnect if we have the project ID
    if (project?.id) {
      toast({
        title: 'Reconnecting',
        description: 'Attempting to reconnect to the coaching agent...',
      });

      // Force a refresh of dashboard data
      if (refresh) {
        refresh();
      }

      // Set a small timeout to ensure the previous connection is fully closed
      setTimeout(() => {
        if (isProjectDataReady && project?.id) {
          // No need to call connect directly - the useEffect will trigger
          // when we refresh/update dependencies
          setIsConnected(false); // Force the connection state to refresh
          setReconnectTrigger((prev) => prev + 1); // Increment to trigger reconnection
        }
      }, 500);
    } else {
      toast({
        title: 'Connection Error',
        description: 'Cannot connect without project data. Please refresh the page.',
        variant: 'destructive',
      });
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Function to scroll chat to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Check if scroll is at bottom with better detection
  const checkIsAtBottom = () => {
    const chatContainer = document.querySelector('.chat-scroll-container');
    if (chatContainer) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      // Consider "at bottom" if within 30px of the bottom
      const isAtBottomNow = scrollHeight - scrollTop - clientHeight < 30;
      setIsAtBottom(isAtBottomNow);
    }
  };

  // Add event listener for scroll with additional handling for tab visibility
  useEffect(() => {
    const chatContainer = document.querySelector('.chat-scroll-container');

    // Check if we're at the bottom when the component mounts
    if (chatContainer) {
      checkIsAtBottom();

      // Add scroll event listener
      chatContainer.addEventListener('scroll', checkIsAtBottom);

      // Also check when tab becomes visible again
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkIsAtBottom();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Clean up
      return () => {
        chatContainer.removeEventListener('scroll', checkIsAtBottom);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []);

  // Suggested messages based on context
  const getSuggestedMessages = (): string[] => {
    // Get level-specific suggested messages
    const currentLevel = level || project?.level || 1;

    const suggestions = [
      'What is the Guardians framework?',
      'How do I set up Guardians?',
      'What goes in a Pod Lead proposal?',
      'Can you help define our DAO goals?',
      'Tips for running Guardian meetings?',
      'How many Pods should we start with?',
    ];

    return suggestions;
  };

  // Update when messages change
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages.length, isAtBottom]);

  // Scroll when typing starts or stops
  useEffect(() => {
    if (isTyping && isAtBottom) {
      scrollToBottom();
    }
  }, [isTyping, isAtBottom]);

  // Loading state
  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 text-center max-w-lg p-8">
          <RefreshCw className="h-12 w-12 animate-spin text-muted-foreground" />
          <h3 className="text-xl font-semibold">Loading Project Data</h3>
          <p className="text-muted-foreground">Connecting to your BioDAO project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src="/coaching-avatar.png" alt="Coaching Agent" />
              <AvatarFallback className="bg-indigo-600">CA</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">Coaching Agent</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Connected' : 'Click refresh to connect'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  • Level {level || project.level} Coach
                </span>
              </div>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleManualRefresh}
          disabled={isLoading}
          title="Reconnect"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Chat Messages Area */}
      <div className="flex flex-row w-full overflow-y-auto grow gap-4 chat-scroll-container">
        <div className="flex flex-col transition-all duration-300 w-full">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Avatar className="h-16 w-16 mb-4">
                <AvatarImage src="/coaching-avatar.png" alt="Coaching Agent" />
                <AvatarFallback className="bg-indigo-600 text-lg">CA</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold mb-2">Welcome to Coaching</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                I'm your personal BioDAO coach. I'll help guide you through the levels and provide
                personalized feedback on your progress.
              </p>
              <Button onClick={() => sendMessage("Hi, I'd like some advice on my project!")}>
                Start Conversation
              </Button>
            </div>
          ) : (
            <div className="flex flex-col p-4 space-y-4">
              {[...messages]
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
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
                        className="flex flex-row items-end gap-2 max-w-full"
                      >
                        {message.isFromAgent && (
                          <Avatar className="size-8 border rounded-full select-none mb-2 flex-shrink-0">
                            <AvatarImage src="/coaching-avatar.png" alt="Coaching Agent" />
                            <AvatarFallback className="bg-indigo-600">CA</AvatarFallback>
                          </Avatar>
                        )}

                        <MemoizedMessageContent
                          message={message}
                          shouldAnimate={shouldAnimate}
                          toast={toast}
                        />
                      </ChatBubble>
                    </div>
                  );
                })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <ChatBubble variant="received" className="flex flex-row items-end gap-2">
                    <Avatar className="size-8 border rounded-full select-none mb-2 flex-shrink-0">
                      <AvatarImage src="/coaching-avatar.png" alt="Coaching Agent" />
                      <AvatarFallback className="bg-indigo-600">CA</AvatarFallback>
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
          )}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && messages.length > 0 && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          variant="outline"
          className="absolute bottom-24 right-4 inline-flex rounded-full shadow-md"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      {/* Suggested messages */}
      {isConnected && (
        <div className="px-4 pb-2 pt-1">
          <div className="flex flex-wrap gap-2">
            {getSuggestedMessages().map((message, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="bg-muted/50 text-xs"
                onClick={() => {
                  setInputValue(message);
                  if (textareaRef.current) {
                    textareaRef.current.focus();
                  }
                }}
              >
                {message}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected ? 'Type your message here...' : 'Reconnecting to coaching agent...'
            }
            disabled={!isConnected || isSending}
            className="min-h-[60px] resize-none"
          />
          <Button
            type="submit"
            disabled={!isConnected || !inputValue.trim() || isSending}
            className="bg-primary hover:bg-primary/90"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
