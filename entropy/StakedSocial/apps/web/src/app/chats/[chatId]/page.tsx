"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send, Info, Check, CheckCheck, Trash2, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { ethers } from "ethers";
import { useMiniApp } from "@/contexts/miniapp-context";
import { useSocket } from "@/contexts/socket-context";
import { useSignMessage } from "wagmi";
import { getXMTPClient } from "@/lib/xmtp";
import { useOptimisticMessaging } from "@/hooks/use-optimistic-messaging";
import BetModal from "@/components/bet-modal";
import PlaceBetModal from "@/components/place-bet-modal";
import BetMessageCard from "@/components/bet-message-card";
import BetPlacementCard from "@/components/bet-placement-card";
import { createMarket, placeBet, getMarketsForChat, getUserPositions, getUserMarketShares, type MarketMetadata } from "@/lib/market-service";
import {
  getChatById,
  getChatMessages,
  saveMessage,
  updateMessageStatus,
  deleteChat,
  saveChat,
  type ChatMessage,
  type ChatMetadata,
} from "@/lib/chat-metadata";


export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.chatId as string;
  const { context, isMiniAppReady } = useMiniApp();
  const { signMessageAsync } = useSignMessage();

  // Extract user data from context
  const user = context?.user;
  const username = user?.username || "@user";
  const [walletAddress, setWalletAddress] = useState("");

  const [chat, setChat] = useState(getChatById(chatId));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showPlaceBetModal, setShowPlaceBetModal] = useState(false);
  const [selectedMarketForBetting, setSelectedMarketForBetting] = useState<MarketMetadata | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [useOptimistic, setUseOptimistic] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Toast notifications
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Markets for this chat
  const [chatMarkets, setChatMarkets] = useState<MarketMetadata[]>([]);

  // Use shared socket connection
  const { socket } = useSocket();

  // Optimistic messaging hook
  const optimistic = useOptimisticMessaging({
    serverUrl: process.env.NEXT_PUBLIC_OPTIMISTIC_SERVER_URL || 'http://localhost:5001',
    userId: walletAddress || username,
    username: username,
    wallet: walletAddress,
    chatId: chatId,
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch user wallet address
  useEffect(() => {
    const fetchUserData = async () => {
      if (!username) return;

      try {
        const response = await fetch(`https://maia-api.ngrok-free.dev/user?username=${username.replace('@', '')}`);
        const userData = await response.json();
        if (userData?.wallet_address) {
          setWalletAddress(userData.wallet_address);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    if (isMiniAppReady && username) {
      fetchUserData();
    }
  }, [isMiniAppReady, username]);

  // Load messages from localStorage but don't mark as loaded yet
  useEffect(() => {
    if (chatId) {
      const loadedMessages = getChatMessages(chatId);
      setMessages(loadedMessages);
      // DON'T set messagesLoaded to true yet - wait for optimistic messages
      scrollToBottom();

      // Clear isNew flag for this chat since user is viewing it
      if (chat) {
        const clearedChat = { ...chat, isNew: false };
        setChat(clearedChat);
        saveChat(clearedChat);
      }

      // Load markets for this chat
      const markets = getMarketsForChat(chatId);
      setChatMarkets(markets);
    }
  }, [chatId]);

  // Join chat room when viewing a specific chat
  useEffect(() => {
    if (!chatId || !socket) return;

    socket.emit('join_chat', {
      chat_id: chatId,
      user_id: walletAddress || username,
    });
  }, [chatId, socket, walletAddress, username]);

  // Sync optimistic messages into the main message list
  useEffect(() => {
    if (!optimistic.messages.length) return;

    const optimisticMessages = optimistic.messages.map((msg: any) => ({
      id: msg.id,
      chatId: chatId,
      content: msg.content,
      senderAddress: msg.wallet || walletAddress,
      timestamp: new Date(msg.timestamp).getTime(),
      status: 'sent' as const,
      type: 'message' as const, // Regular messages
    }));

    // Get all bet messages from localStorage
    const allMessages = getChatMessages(chatId);
    const betMessages = allMessages.filter(m => m.type === 'bet');

    // Combine bet messages with optimistic messages and sort by timestamp
    const combinedMessages = [...betMessages, ...optimisticMessages].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Only update if message count changed
    if (combinedMessages.length !== messages.length || optimisticMessages.length !== messages.filter(m => m.type === 'message').length) {
      setMessages(combinedMessages);
      // Only mark as loaded when we actually have messages to display
      setMessagesLoaded(true);

      // Update chat metadata with latest message
      if (chat && optimisticMessages.length > 0) {
        const lastMsg = optimisticMessages[optimisticMessages.length - 1];
        const senderProfile = chat.memberProfiles?.[lastMsg.senderAddress];
        const senderName = senderProfile?.username || lastMsg.senderAddress.slice(0, 6);

        const updatedChat: ChatMetadata = {
          ...chat,
          lastMessageTime: lastMsg.timestamp,
          lastMessage: `${senderName}: ${lastMsg.content.substring(0, 50)}`,
          lastMessageSender: lastMsg.senderAddress,
          isNew: false, // Don't mark as new if user is viewing this chat
        };

        saveChat(updatedChat);

        // Emit to shared socket for other clients
        // For other clients not viewing this chat, mark as new
        if (socket) {
          const chatUpdateData = {
            chat_id: chatId,
            chat: {
              ...updatedChat,
              isNew: true, // Other clients should see this as new
            },
          };

          // Emit to the chat room
          socket.emit('update_chat', chatUpdateData);

          // Also broadcast to all connected clients as fallback
          socket.emit('broadcast_chat_update', chatUpdateData);
        }
      }
    }
  }, [optimistic.messages, chatId]);

  // Mark as loaded if no messages after a timeout
  useEffect(() => {
    if (messagesLoaded) return; // Already loaded, don't set timeout

    const timeout = setTimeout(() => {
      // If we still haven't loaded after 2 seconds, show "no messages"
      setMessagesLoaded(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [messagesLoaded, chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      await optimistic.sendMessage(messageContent);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteChat = () => {
    console.log('[DELETE] Delete button clicked');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    console.log('[DELETE] Confirmed deletion');
    try {
      console.log('[DELETE] Deleting chat:', chatId);
      deleteChat(chatId);
      console.log('[DELETE] Chat deleted');

      // Emit deletion event to all connected clients
      if (socket) {
        console.log('[DELETE] Emitting delete_chat event to socket');
        socket.emit('delete_chat', {
          chat_id: chatId,
          user_id: walletAddress || username,
        });
        socket.emit('broadcast_delete_chat', {
          chat_id: chatId,
          user_id: walletAddress || username,
        });
      }

      setShowDeleteConfirm(false);
      setShowInfoModal(false);
      console.log('[DELETE] Redirecting to /chats');
      router.push('/chats');
    } catch (error) {
      console.error("[DELETE] Error deleting chat:", error);
    }
  };

  const cancelDelete = () => {
    console.log('[DELETE] Cancelled deletion');
    setShowDeleteConfirm(false);
  };

  const handleCreateBet = async (betData: any) => {
    console.log('[BET] Creating bet with data:', betData);

    try {
      // Extract outcomes text from the bet data
      const outcomeTexts = betData.outcomes.map((o: any) => o.text);

      // Create market on-chain
      const { marketId, metadata } = await createMarket({
        question: betData.question,
        description: betData.description,
        outcomes: outcomeTexts,
        deadline: betData.deadline,
        shareSizeWei: betData.shareSize,
        targets: betData.targets.map((t: any) => t.wallet),
        chatId: chatId,
        creatorUsername: username,
        groupId: chatId,
      });

      console.log('[BET] Market created successfully:', marketId);

      // Update chat markets list
      const updatedMarkets = getMarketsForChat(chatId);
      setChatMarkets(updatedMarkets);

      // Reload messages to show the new bet message
      const updatedMessages = getChatMessages(chatId);
      setMessages(updatedMessages);
      scrollToBottom();

      // Show success toast
      setToast({
        type: "success",
        message: "Market created successfully!",
      });

      // Auto-hide success toast after 3 seconds
      setTimeout(() => setToast(null), 3000);

      return { marketId, metadata };
    } catch (error: any) {
      console.error('[BET] Error creating market:', error);

      // Handle specific error types
      if (error.message === "INSUFFICIENT_FUNDS") {
        setToast({
          type: "error",
          message: "Insufficient funds to create market. Please add funds to the admin account.",
        });
      } else {
        setToast({
          type: "error",
          message: error.message || "Failed to create market. Please try again.",
        });
      }

      throw error;
    }
  };

  const handlePlaceBet = async (outcomeIndex: number, sharesAmount: string) => {

    // console.log(window.ethereum)
    // console.log(window.ethereum?.providers)
    // console.log(window.ethereum?.isFarcaster)

    try {
      if (!selectedMarketForBetting) {
        setToast({
          type: "error",
          message: "No market selected.",
        });
        return;
      }
  
      if (!walletAddress) {
        setToast({
          type: "error",
          message: "No wallet connected.",
        });
        return;
      }
  
      const result = await placeBet({
        marketId: selectedMarketForBetting.onchain.marketId,
        outcomeIndex,
        amountWei: sharesAmount,
        userAddress: walletAddress,
        username,
        signMessageAsync,
      });
  
      const updatedMarkets = getMarketsForChat(chatId);
      setChatMarkets(updatedMarkets);
  
      const updatedMessages = getChatMessages(chatId);
      setMessages(updatedMessages);
      scrollToBottom();
  
      setToast({
        type: "success",
        message: "Bet placed successfully!",
      });
  
      setTimeout(() => setToast(null), 3000);
      setShowPlaceBetModal(false);
      setSelectedMarketForBetting(null);
    } catch (error: any) {
      setToast({
        type: "error",
        message: error.message || "Failed to place bet.",
      });
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (message: ChatMessage) => {
    // Compare wallet addresses (case insensitive)
    return message.senderAddress?.toLowerCase() === walletAddress?.toLowerCase();
  };

  if (!isMiniAppReady || !chat) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/95 shadow-sm border-b border-gray-200 px-3 py-2 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/chats')}
            className="p-1.5 hover:bg-gray-100 active:scale-95 rounded-full transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900">{chat.chatName}</h1>
            <p className="text-xs text-gray-500">{chat.memberWallets.length} member{chat.memberWallets.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowBetModal(true)}
            className="p-1.5 hover:bg-gray-100 active:scale-95 rounded-full transition-all"
            title="Create a bet"
          >
            <Plus className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-1.5 hover:bg-gray-100 active:scale-95 rounded-full transition-all"
          >
            <Info className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {!messagesLoaded ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="relative w-12 h-12 mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-20 animate-pulse"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600"></div>
            </div>
            <p className="text-xs text-gray-500 font-medium">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <p className="text-xs text-gray-500 font-medium">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              // Check if this is a bet message
              if (message.type === 'bet' && message.marketId) {
                const market = chatMarkets.find(m => m.onchain.marketId === message.marketId);
                if (!market) return null; // Market not loaded yet

                return (
                  <BetMessageCard
                    key={message.id}
                    question={market.static.question}
                    creatorName={market.runtime.creatorUsername || market.onchain.creator.slice(0, 8)}
                    deadline={new Date(parseInt(market.onchain.deadline) * 1000).toISOString()}
                    onPlaceBet={() => {
                      console.log('[BET] Place bet clicked for market:', market.onchain.marketId);
                      setSelectedMarketForBetting(market);
                      setShowPlaceBetModal(true);
                    }}
                  />
                );
              }

              // Regular message
              const isMine = isMyMessage(message);
              const senderProfile = chat?.memberProfiles?.[message.senderAddress];
              const senderUsername = senderProfile?.username || message.senderAddress.slice(0, 6) + '...';
              const senderPfp = senderProfile?.pfp;
              const senderDisplayName = senderProfile?.display_name || senderUsername;

              // Check if this is a bet placement message - if so, also render the BetPlacementCard
              const isBetPlacementMessage = message.content.includes('placed a bet on');

              return (
                <div key={message.id}>
                  <div
                    className={`flex gap-1 animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      animationDelay: `${index * 30}ms`,
                    }}
                  >
                    {/* Profile Picture for Others */}
                    {!isMine && (
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                        {senderPfp ? (
                          <img
                            src={senderPfp}
                            alt={senderUsername}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                            {senderDisplayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-0.5`}>
                      {/* Username for Others */}
                      {!isMine && (
                        <span className="text-xs font-semibold text-gray-600 px-1.5">
                          {senderDisplayName}
                        </span>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-1.5 ${
                          isMine
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                        }`}
                      >
                        <p className="text-xs break-words">{message.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-0.5 text-xs ${
                            isMine ? 'text-blue-100 justify-end' : 'text-gray-500'
                          }`}
                        >
                          <span className="text-xs">{formatTimestamp(message.timestamp)}</span>
                          {isMine && (
                            <span>
                              {message.status === 'sending' && <Check className="h-2.5 w-2.5" />}
                              {message.status === 'sent' && <CheckCheck className="h-2.5 w-2.5" />}
                              {message.status === 'failed' && <span className="text-red-300">!</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Render BetPlacementCard for bet placement messages */}
                  {isBetPlacementMessage && (
                    <div className="mt-1">
                      <BetPlacementCard
                        betterName={senderDisplayName}
                        betterPfp={senderPfp}
                        questionText={message.content.split('"')[1] || 'a bet'}
                        timestamp={message.timestamp}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mock Bet Placement Examples */}
            <div className="mt-4 pt-2 border-t border-gray-200 space-y-2">
              <BetPlacementCard
                betterName="Pragya"
                betterPfp="https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/3355c5ea-0758-45ef-a113-a13f89be1500/rectcontain2"
                questionText="Will nevan get a girl (Nov 29)?"
                timestamp={Date.now() - 5 * 60 * 1000} // 5 minutes ago
              />
              <BetPlacementCard
                betterName="Pulkith"
                betterPfp="https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
                questionText="Will nevan get a girl (Nov 29)?"
                timestamp={Date.now() - 2 * 60 * 1000} // 2 minutes ago
              />
              {/* <BetPlacementCard
                betterName="Mike"
                questionText="Will it rain tomorrow?"
                timestamp={Date.now() - 30 * 1000} // 30 seconds ago
              /> */}
            </div>
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/95 border-t border-gray-200 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
            disabled={isSending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-in fade-in duration-300"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in scale-95 fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Chat Info</h2>

            <div className="space-y-3 mb-6">
              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-600 mb-1">Chat Name</h3>
                <p className="text-sm text-gray-900 font-medium">{chat.chatName}</p>
              </div>

              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-600 mb-1">Members</h3>
                <p className="text-sm text-gray-900 font-medium">{chat.memberWallets.length} member{chat.memberWallets.length !== 1 ? 's' : ''}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-600 mb-1">Created</h3>
                <p className="text-sm text-gray-900">
                  {new Date(chat.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <button
              onClick={handleDeleteChat}
              className="w-full bg-red-600 text-white font-medium py-2 text-sm rounded-lg hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <Trash2 className="h-4 w-4" />
              Delete Chat
            </button>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-2 bg-gray-100 text-gray-900 font-medium py-2 text-sm rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-in fade-in duration-300"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in scale-95 fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-3">Delete Chat?</h2>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this chat? This action cannot be undone.</p>

            <div className="flex gap-2">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-100 text-gray-900 font-medium py-2 text-sm rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white font-medium py-2 text-sm rounded-lg hover:bg-red-700 active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bet Modal */}
      <BetModal
        isOpen={showBetModal}
        onClose={() => setShowBetModal(false)}
        groupMembers={
          chat?.memberProfiles
            ? Object.entries(chat.memberProfiles).map(([wallet, profile]: [string, any]) => ({
                username: profile.username || profile.display_name || wallet.slice(0, 6),
                wallet,
                pfp: profile.pfp,
              }))
            : []
        }
        onCreateBet={handleCreateBet}
      />

      {/* Place Bet Modal */}
      {selectedMarketForBetting && (
        <PlaceBetModal
          isOpen={showPlaceBetModal}
          onClose={() => {
            setShowPlaceBetModal(false);
            setSelectedMarketForBetting(null);
          }}
          market={selectedMarketForBetting}
          userAddress={walletAddress}
          username={username}
          onPlaceBet={handlePlaceBet}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <>
          {toast.type === "success" ? (
            // Success toast - top of screen
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300">
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
            </div>
          ) : (
            // Error toast - center of screen with backdrop
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-in fade-in duration-300"
              onClick={() => setToast(null)}
            >
              <div
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in scale-95 fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      {toast.message?.includes('market') ? 'Market Creation Failed' : 'Bet Placement Failed'}
                    </h3>
                    <p className="text-sm text-gray-600">{toast.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => setToast(null)}
                  className="w-full bg-gray-100 text-gray-900 font-medium py-2 text-sm rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
