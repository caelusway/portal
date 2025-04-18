'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../ui/button';
import { ChatBubble, ChatBubbleMessage, ChatBubbleTimestamp } from '../ui/chat/chat-bubble';
import { ChatInput } from '../ui/chat/chat-input';
import { ChatMessageList } from '../ui/chat/chat-message-list';
import { USER_NAME } from '@/constants';
import { useMessages } from '@/hooks/use-query-hooks';
import SocketIOManager from '@/lib/socketio-manager';
import { cn, getEntityId, moment } from '@/lib/utils';
import { WorldManager } from '@/lib/world-manager';
import type { Agent, Content, UUID } from '@elizaos/core';
import { AgentStatus } from '@elizaos/core';
import { useQueryClient } from '@tanstack/react-query';
import { PanelRight, Paperclip, Send, X, Loader2 } from 'lucide-react';
import AIWriter from 'react-aiwriter';
import { AudioRecorder } from '../audio-recorder';
import CopyButton from '../copy-button';
import { Avatar, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import ChatTtsButton from '../ui/chat/chat-tts-button';
import { useAutoScroll } from '../ui/chat/hooks/useAutoScroll';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { CHAT_SOURCE } from '@/constants';
import clientLogger from '@/lib/logger';
import { useAuth } from '@/lib/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  mintNftToUser,
  ZORA_CONTRACT_ADDRESS,
  IDEA_NFT_ID,
  VISION_NFT_ID,
  publicClient,
} from '@/lib/nft-actions';
import { baseSepolia } from 'viem/chains';
import type { Hex } from 'viem';
import { useUserLevelContext } from '@/lib/user-level.tsx';
import { updateRequirementProgress } from '@/lib/api/user-levels';
import { readContract } from 'viem/actions';
import { useWallets, ConnectedWallet } from '@privy-io/react-auth';
import { useUserData } from '../../hooks/use-user-data';
import { useUserLevel } from '../../hooks/use-user-level';

// NOTE: This component requires UserLevelProvider to be present in the React tree.

const LEVELS = {
  1: { label: 'App Started', requirements: ['Wallet connected'] },
  2: { label: 'Science NFTs Minted', requirements: ['Minted Idea NFT', 'Minted Vision NFT'] },
  3: {
    label: 'Community Initiated',
    requirements: ['Share Invite Link', 'Invite Portal Bot', '4 Discord members'],
  },
  4: {
    label: 'Community Growth + Proof',
    requirements: ['10 Discord members', '25 papers shared', '100 messages sent'],
  },
};

interface IAttachment {
  url: string;
  title: string;
}

type ExtraContentFields = {
  name: string;
  createdAt: number;
  isLoading?: boolean;
  thought?: string;
  actions?: string | string[];
  attachments?: IAttachment[];
};

type ContentWithUser = Content & ExtraContentFields;

interface CoreAgentChatProps {
  agentId: UUID;
  worldId: UUID;
  agentData: Agent;
  showDetails: boolean;
  toggleDetails: () => void;
  initialMessage?: string;
}

const MemoizedMessageContent = React.memo(MessageContent);

function MessageContent({
  message,
  agentId,
  shouldAnimate,
}: {
  message: ContentWithUser;
  agentId: UUID;
  shouldAnimate: boolean;
}) {
  return (
    <div className="flex flex-col w-full">
      <ChatBubbleMessage
        isLoading={message.isLoading}
        {...(message.name === USER_NAME ? { variant: 'sent' } : {})}
        {...(!message.text ? { className: 'bg-transparent' } : {})}
      >
        <div className="py-2">
          {message.name === USER_NAME ? (
            message.text
          ) : shouldAnimate ? (
            <AIWriter>{message.text}</AIWriter>
          ) : (
            message.text
          )}
        </div>
        {!message.text &&
          message.thought &&
          (message.name === USER_NAME ? (
            message.thought
          ) : shouldAnimate ? (
            <AIWriter>
              <span className="italic text-muted-foreground">{message.thought}</span>
            </AIWriter>
          ) : (
            <span className="italic text-muted-foreground">{message.thought}</span>
          ))}

        {message.attachments?.map((attachment: IAttachment) => (
          <div className="flex flex-col gap-1" key={`${attachment.url}-${attachment.title}`}>
            <img
              alt="attachment"
              src={attachment.url}
              width="100%"
              height="100%"
              className="w-64 rounded-md"
            />
            <div className="flex items-center justify-between gap-4">
              <span />
              <span />
            </div>
          </div>
        ))}
        {message.text && message.createdAt && (
          <ChatBubbleTimestamp timestamp={moment(message.createdAt).format('LT')} />
        )}
      </ChatBubbleMessage>
      {message.name !== USER_NAME && (
        <div className="flex justify-between items-end w-full">
          <div>
            {message.text && !message.isLoading ? (
              <div className="flex items-center gap-2">
                <CopyButton text={message.text} />
                <ChatTtsButton agentId={agentId} text={message.text} />
              </div>
            ) : (
              <div />
            )}
          </div>
          <div>
            {message.text && message.actions && (
              <Badge variant="outline" className="text-sm">
                {Array.isArray(message.actions) ? message.actions.join(', ') : message.actions}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal ABI for ERC1155 balanceOf
const erc1155BalanceOfAbi = [
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function CoreAgentChat({
  agentId,
  worldId,
  agentData,
  showDetails,
  toggleDetails,
  initialMessage,
}: CoreAgentChatProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [input, setInput] = useState('');
  const [messageProcessing, setMessageProcessing] = useState<boolean>(false);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintingAttempted, setMintingAttempted] = useState<boolean>(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { level, isLoading: levelLoading, refetchLevel, incrementLevel } = useUserLevel();
  const { wallets } = useWallets();

  // Loader: Wait for embedded wallet to be loaded
  const embeddedWallet = wallets.find(
    (wallet: ConnectedWallet) => wallet.walletClientType === 'privy'
  );

  if (!user || !user.id) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <img src="/bioicon.png" alt="BIO Logo" className="h-12 mb-4" />
          <p className="text-muted-foreground">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  if (!embeddedWallet) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="size-10 animate-spin mb-4 text-bio-accent" />
        <p className="text-muted-foreground text-lg">Loading your embedded wallet...</p>
      </div>
    );
  }

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const entityId = getEntityId();
  const roomId = WorldManager.generateRoomId(agentId);
  const userId = user?.id || '';

  const { data: messages = [] } = useMessages(agentId, roomId);
  const socketIOManager = SocketIOManager.getInstance();
  const animatedMessageIdRef = useRef<string | null>(null);

  const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
    smooth: true,
  });

  const scrollRefId = useRef(`scroll-${Math.random().toString(36).substring(2, 9)}`).current;

  const prevMessageCountRef = useRef(0);

  const safeScrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 0);
  }, [scrollToBottom]);

  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      if (isAtBottom) {
        clientLogger.info(`[CoreAgentChat][${scrollRefId}] User is at bottom, scrolling down.`);
        safeScrollToBottom();
      } else {
        clientLogger.info(
          `[CoreAgentChat][${scrollRefId}] User scrolled up, maintaining position.`
        );
      }
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length, safeScrollToBottom, scrollRefId, isAtBottom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const addAgentMessage = useCallback(
    (text: string) => {
      const agentMessage: ContentWithUser = {
        id: uuidv4(),
        text: text,
        name: agentData?.name || 'Agent',
        senderId: agentId,
        senderName: agentData?.name || 'Agent',
        roomId: roomId,
        createdAt: Date.now(),
        isLoading: false,
        source: CHAT_SOURCE,
        userId: userId,
      };

      clientLogger.info('[CoreAgentChat] Adding agent message to UI:', agentMessage);

      queryClient.setQueryData(
        ['messages', agentId, roomId, worldId],
        (old: ContentWithUser[] = []) => {
          if (old.some((msg) => msg.id === agentMessage.id)) return old;
          animatedMessageIdRef.current = agentMessage.id as string;
          return [...old, agentMessage];
        }
      );
    },
    [agentId, agentData?.name, roomId, userId, queryClient, worldId]
  );

  const handleMintingSuccess = useCallback(async () => {
    await refetchLevel();
    try {
      const ideaResult = await updateRequirementProgress(user.id, 1, 'mint_idea_nft', true);
      const visionResult = await updateRequirementProgress(user.id, 1, 'mint_vision_nft', true);
      if (!ideaResult.success || !visionResult.success) {
        toast({
          title: 'Progress Update Issue',
          description: 'Could not update all progress milestones.',
          variant: 'destructive',
        });
      }
    } catch (progressError) {
      toast({
        title: 'Progress Update Error',
        description: 'An unexpected error occurred while updating progress.',
        variant: 'destructive',
      });
    }
  }, [refetchLevel, user.id, toast]);

  const triggerMintingProcess = useCallback(async () => {
    console.log('[triggerMintingProcess] Starting NFT mint process...', { level });
    if (level !== 1) {
      console.warn(`[triggerMintingProcess] Aborting: User level is ${level}, not 1.`);
      return;
    }
    if (isMinting) {
      console.warn('[triggerMintingProcess] Aborting: Minting already in progress.');
      return;
    }
    const embeddedWallet = wallets.find(
      (wallet: ConnectedWallet) => wallet.walletClientType === 'privy'
    );
    if (!embeddedWallet) {
      toast({
        title: 'Wallet Not Found',
        description: 'No embedded wallet found.',
        variant: 'destructive',
      });
      addAgentMessage('NFT mint failed: No embedded wallet found.');
      return;
    }
    try {
      const ideaBalance = await readContract(publicClient, {
        address: ZORA_CONTRACT_ADDRESS,
        abi: erc1155BalanceOfAbi,
        functionName: 'balanceOf',
        args: [embeddedWallet.address as Hex, IDEA_NFT_ID],
      });
      const visionBalance = await readContract(publicClient, {
        address: ZORA_CONTRACT_ADDRESS,
        abi: erc1155BalanceOfAbi,
        functionName: 'balanceOf',
        args: [embeddedWallet.address as Hex, VISION_NFT_ID],
      });
      if (ideaBalance > 0n && visionBalance > 0n) {
        return;
      }
    } catch (balanceError) {
      console.error('[triggerMintingProcess] Error checking NFT balances:', balanceError);
      toast({
        title: 'NFT Check Failed',
        description: 'Could not verify your existing NFTs. Please try again.',
        variant: 'destructive',
      });
      addAgentMessage('NFT mint failed: Could not verify your existing NFTs.');
      return;
    }
    setIsMinting(true);
    addAgentMessage('Minting your Idea and Vision NFTs now...');
    try {
      const ideaNftHash = await mintNftToUser(
        embeddedWallet.address as Hex,
        IDEA_NFT_ID,
        1,
        'Minting Idea NFT via BioDAO Portal'
      );
      await publicClient.waitForTransactionReceipt({ hash: ideaNftHash, timeout: 120_000 });
      const visionNftHash = await mintNftToUser(
        embeddedWallet.address as Hex,
        VISION_NFT_ID,
        1,
        'Minting Vision NFT via BioDAO Portal'
      );
      await publicClient.waitForTransactionReceipt({ hash: visionNftHash, timeout: 120_000 });
      toast({ title: 'NFTs Minted Successfully!', variant: 'default', duration: 5000 });
      const nextLevelInfo = LEVELS[3];
      const requirementsText = nextLevelInfo.requirements.join(', ');
      addAgentMessage(`NFTs minted successfully! You are now Level 2: ${LEVELS[2].label}.
Next step (Level 3): ${nextLevelInfo.label}.
Requirements: ${requirementsText}.`);
      await handleMintingSuccess();
    } catch (error: any) {
      const errorMsg = error.message || 'An unknown error occurred during NFT mint.';
      toast({
        title: 'NFT Mint Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsMinting(false);
    }
  }, [level, isMinting, wallets, toast, addAgentMessage, handleMintingSuccess]);

  useEffect(() => {
    if (!levelLoading && level === 1 && !isMinting && !mintingAttempted && user.id) {
      setMintingAttempted(true);
      triggerMintingProcess();
    }
  }, [levelLoading, level, isMinting, mintingAttempted, triggerMintingProcess, user.id]);

  useEffect(() => {
    socketIOManager.initialize(entityId, [agentId], { userId });

    const joinRoom = async () => {
      try {
        await socketIOManager.joinRoom(roomId, { userId });
        clientLogger.info(`[CoreAgentChat] Joined room ${roomId} with agent ${agentId}`);

        if (initialMessage && messages.length === 0) {
          socketIOManager.sendMessage(initialMessage, roomId, CHAT_SOURCE, { userId });
          clientLogger.info(`[CoreAgentChat] Sent initial message: "${initialMessage}"`);
        }
      } catch (error) {
        clientLogger.error(`[CoreAgentChat] Failed to join room ${roomId}:`, error);
      }
    };
    joinRoom();

    const handleMessageBroadcasting = (data: ContentWithUser) => {
      if (!data) {
        clientLogger.warn('[CoreAgentChat] Received empty or invalid message data:', data);
        return;
      }

      if (data.roomId !== roomId) {
        clientLogger.info(
          `[CoreAgentChat] Ignoring message for different room: ${data.roomId}, we're in ${roomId}`
        );
        return;
      }

      const isCurrentUser = data.senderId === entityId;
      const newMessage: ContentWithUser = {
        ...data,
        name: isCurrentUser ? USER_NAME : (data.senderName as string),
        createdAt: data.createdAt || Date.now(),
        isLoading: false,
      };

      clientLogger.info(
        `[CoreAgentChat] Adding new message to UI from ${newMessage.name}:`,
        newMessage
      );

      queryClient.setQueryData(
        ['messages', agentId, roomId, worldId],
        (old: ContentWithUser[] = []) => {
          clientLogger.info(`[CoreAgentChat] Current messages:`, old?.length || 0);
          const isDuplicate = old.some(
            (msg) =>
              msg.text === newMessage.text &&
              msg.name === newMessage.name &&
              Math.abs((msg.createdAt || 0) - (newMessage.createdAt || 0)) < 5000
          );

          if (isDuplicate) {
            clientLogger.info(`[CoreAgentChat] Skipping duplicate message`);
            return old;
          }

          animatedMessageIdRef.current = typeof newMessage.id === 'string' ? newMessage.id : null;
          return [...old, newMessage];
        }
      );
    };

    const handleMessageComplete = (data: any) => {
      if (data.roomId === roomId) {
        clientLogger.info(`[CoreAgentChat] Message complete for room ${roomId}`);
        setMessageProcessing(false);
      }
    };

    clientLogger.info('[CoreAgentChat] Adding message listeners');
    const msgHandler = socketIOManager.evtMessageBroadcast.attach((data) => [
      data as unknown as ContentWithUser,
    ]);
    const completeHandler = socketIOManager.evtMessageComplete.attach((data) => [
      data as unknown as any,
    ]);

    msgHandler.attach(handleMessageBroadcasting);
    completeHandler.attach(handleMessageComplete);

    return () => {
      clientLogger.info(`[CoreAgentChat] Leaving room ${roomId}`);
      socketIOManager.leaveRoom(roomId);
      msgHandler.detach();
      completeHandler.detach();
    };
  }, [
    roomId,
    agentId,
    entityId,
    queryClient,
    socketIOManager,
    worldId,
    userId,
    initialMessage,
    messages.length,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.nativeEvent.isComposing) return;
      handleSendMessage(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || messageProcessing || isMinting) return;

    const messageId = uuidv4();
    const userMessage: ContentWithUser = {
      text: input,
      name: USER_NAME,
      createdAt: Date.now(),
      senderId: entityId,
      senderName: USER_NAME,
      roomId: roomId,
      source: CHAT_SOURCE,
      id: messageId,
      userId: userId,
    };

    clientLogger.info(`[CoreAgentChat] Adding user message to UI:`, userMessage);

    queryClient.setQueryData(
      ['messages', agentId, roomId, worldId],
      (old: ContentWithUser[] = []) => {
        const exists = old.some(
          (msg) =>
            msg.text === userMessage.text &&
            msg.name === USER_NAME &&
            Math.abs((msg.createdAt || 0) - userMessage.createdAt) < 1000
        );

        if (exists) {
          clientLogger.info(`[CoreAgentChat] Skipping duplicate user message`);
          return old;
        }

        return [...old, userMessage];
      }
    );

    socketIOManager.sendMessage(input, roomId, CHAT_SOURCE, { userId });
    setMessageProcessing(true);
    setSelectedFile(null);
    setInput('');
    formRef.current?.reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  return (
    <div
      className={`flex flex-col w-full h-screen p-4 ${showDetails ? 'col-span-3' : 'col-span-4'}`}
    >
      <div className="flex items-center justify-between mb-4 p-3 bg-card rounded-lg border">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border rounded-full">
            <AvatarImage
              src={agentData?.settings?.avatar ? agentData?.settings?.avatar : '/bioicon.png'}
            />
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">{agentData?.name || 'Agent'}</h2>
              {agentData?.status === AgentStatus.ACTIVE ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="size-2.5 rounded-full bg-green-500 ring-2 ring-green-500/20 animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Agent is active</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="size-2.5 rounded-full bg-gray-300 ring-2 ring-gray-300/20" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Agent is inactive</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {agentData?.bio && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {Array.isArray(agentData.bio) ? agentData.bio[0] : agentData.bio}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleDetails}
          className={cn('gap-1.5', showDetails && 'bg-secondary')}
        >
          <PanelRight className="size-4" />
        </Button>
      </div>

      <div className="flex flex-row w-full overflow-y-auto grow gap-4">
        <div className={cn('flex flex-col transition-all duration-300 w-full')}>
          <ChatMessageList
            scrollRef={scrollRef}
            isAtBottom={isAtBottom}
            scrollToBottom={safeScrollToBottom}
            disableAutoScroll={disableAutoScroll}
          >
            {messages.map((message: ContentWithUser, index: number) => {
              const isUser = message.name === USER_NAME;
              const shouldAnimate =
                index === messages.length - 1 &&
                message.name !== USER_NAME &&
                message.id === animatedMessageIdRef.current;
              return (
                <div
                  key={`${message.id as string}-${message.createdAt}`}
                  className={cn(
                    'flex flex-col gap-1 p-1',
                    isUser ? 'justify-start' : 'justify-start'
                  )}
                >
                  <ChatBubble
                    variant={isUser ? 'sent' : 'received'}
                    className={`flex flex-row items-end gap-2`}
                  >
                    {message.text && !isUser && (
                      <Avatar className="size-8 border rounded-full select-none mb-2">
                        <AvatarImage
                          src={
                            isUser
                              ? '/user-icon.png'
                              : agentData?.settings?.avatar
                                ? agentData?.settings?.avatar
                                : '/bioicon.png'
                          }
                        />
                      </Avatar>
                    )}

                    <MemoizedMessageContent
                      message={message}
                      agentId={agentId}
                      shouldAnimate={shouldAnimate}
                    />
                  </ChatBubble>
                </div>
              );
            })}
          </ChatMessageList>

          <div className="px-4 pb-4 mt-auto">
            <form
              ref={formRef}
              onSubmit={handleSendMessage}
              className="relative rounded-md border bg-card"
            >
              {selectedFile ? (
                <div className="p-3 flex">
                  <div className="relative rounded-md border p-2">
                    <Button
                      onClick={() => setSelectedFile(null)}
                      className="absolute -right-2 -top-2 size-[22px] ring-2 ring-background"
                      variant="outline"
                      size="icon"
                    >
                      <X />
                    </Button>
                    <img
                      alt="Selected file"
                      src={URL.createObjectURL(selectedFile)}
                      height="100%"
                      width="100%"
                      className="aspect-square object-contain w-16"
                    />
                  </div>
                </div>
              ) : null}
              <ChatInput
                ref={inputRef}
                onKeyDown={handleKeyDown}
                value={input}
                onChange={({ target }) => setInput(target.value)}
                placeholder={isMinting ? 'Minting in progress...' : 'Type your message here...'}
                className="min-h-12 resize-none rounded-md bg-card border-0 p-3 shadow-none focus-visible:ring-0"
                disabled={isMinting || messageProcessing}
              />
              <div className="flex items-center p-3 pt-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.click();
                          }
                        }}
                        disabled={isMinting || messageProcessing}
                      >
                        <Paperclip className="size-4" />
                        <span className="sr-only">Attach file</span>
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Attach file</p>
                  </TooltipContent>
                </Tooltip>
                <AudioRecorder
                  agentId={agentId}
                  onChange={(newInput: string) => setInput(newInput)}
                />
                <Button
                  disabled={messageProcessing || isMinting}
                  type="submit"
                  size="sm"
                  className="ml-auto gap-1.5 h-[30px]"
                >
                  {messageProcessing || isMinting ? (
                    <div className="flex gap-0.5 items-center justify-center">
                      {isMinting && <Loader2 className="size-3.5 mr-1 animate-spin" />}
                      <span className="w-[4px] h-[4px] bg-gray-500 rounded-full animate-bounce [animation-delay:0s]" />
                      <span className="w-[4px] h-[4px] bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-[4px] h-[4px] bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : (
                    <Send className="size-3.5" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
