"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageCircle, TrendingUp } from "lucide-react";
import { useMiniApp } from "@/contexts/miniapp-context";
import { useSocket } from "@/contexts/socket-context";
import { getAllChats, type ChatMetadata, getChatMessages, saveChat, deleteChat } from "@/lib/chat-metadata";
import { getMarketsForChat } from "@/lib/market-service";
import { getXMTPClient } from "@/lib/xmtp";
import { useSignMessage } from "wagmi";

export default function ChatsPage() {
  const router = useRouter();
  const { context, isMiniAppReady } = useMiniApp();
  const { signMessageAsync } = useSignMessage();
  const { socket } = useSocket();
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract user data from context
  const user = context?.user;
  const username = user?.username || "@user";
  // Note: We'll fetch the wallet_address from the user API like in invite-friends
  const [walletAddress, setWalletAddress] = useState("");

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

  // Load chats from localStorage ONLY (not backend - prevents re-adding deleted chats)
  useEffect(() => {
    const loadChats = async () => {
      setIsLoading(true);
      try {
        // Load from localStorage only
        const localChats = getAllChats();

        // Sort by last message time or created time
        localChats.sort((a, b) => {
          const timeA = a.lastMessageTime || a.createdAt;
          const timeB = b.lastMessageTime || b.createdAt;
          return timeB - timeA;
        });
        setChats(localChats);
      } catch (error) {
        console.error("Error loading chats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isMiniAppReady) {
      loadChats();
    }
  }, [isMiniAppReady]);

  // XMTP polling disabled - messages come from optimistic messaging

  // Join chat rooms and listen for updates via shared socket
  useEffect(() => {
    if (!socket || (!walletAddress && !username)) return;

    // Join user to their chat rooms
    const localChats = getAllChats();
    localChats.forEach(chat => {
      socket.emit('join_chat', {
        chat_id: chat.chatId,
        user_id: walletAddress || username,
      });
    });

    socket.on('new_chat_created', (chatData: ChatMetadata) => {
      saveChat(chatData);
      setChats(prev => {
        const exists = prev.some(c => c.chatId === chatData.chatId);
        if (!exists) {
          return [chatData, ...prev];
        }
        return prev;
      });

      // Join the new chat room
      socket.emit('join_chat', {
        chat_id: chatData.chatId,
        user_id: walletAddress || username,
      });
    });

    // Listen for message updates in chats
    const handleChatUpdate = (data: { chat_id: string; chat: ChatMetadata }) => {
      console.log('Received update_chat:', data);

      // Save to localStorage
      saveChat(data.chat);

      setChats(prev => {
        const chatExists = prev.some(c => c.chatId === data.chat_id);

        if (!chatExists) {
          console.log('Chat not in local list, adding it:', data.chat_id);
          // Add new chat if it doesn't exist
          const updated = [data.chat, ...prev];
          updated.sort((a, b) => {
            const timeA = a.lastMessageTime || a.createdAt;
            const timeB = b.lastMessageTime || b.createdAt;
            return timeB - timeA;
          });
          return updated;
        }

        const updated = prev.map(c => {
          if (c.chatId === data.chat_id) {
            console.log('Updating chat:', data.chat_id, 'isNew:', data.chat.isNew);
            return { ...data.chat };
          }
          return c;
        });

        // Sort by last message time
        updated.sort((a, b) => {
          const timeA = a.lastMessageTime || a.createdAt;
          const timeB = b.lastMessageTime || b.createdAt;
          return timeB - timeA;
        });

        return updated;
      });
    };

    socket.on('update_chat', handleChatUpdate);
    socket.on('broadcast_chat_update', handleChatUpdate);

    // Listen for chat deletions
    const handleChatDeleted = (data: { chat_id: string }) => {
      console.log('[DELETE] Received chat deletion:', data.chat_id);
      // Also delete from localStorage when we get the event
      deleteChat(data.chat_id);
      setChats(prev => {
        const filtered = prev.filter(c => c.chatId !== data.chat_id);
        console.log('[DELETE] Removed deleted chat from list');
        return filtered;
      });
    };

    socket.on('delete_chat', handleChatDeleted);
    socket.on('broadcast_delete_chat', handleChatDeleted);

    return () => {
      socket.off('new_chat_created');
      socket.off('update_chat', handleChatUpdate);
      socket.off('broadcast_chat_update', handleChatUpdate);
      socket.off('delete_chat', handleChatDeleted);
      socket.off('broadcast_delete_chat', handleChatDeleted);
    };
  }, [socket, walletAddress, username]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!isMiniAppReady) {
    return (
      <main className="flex-1">
        <section className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="w-full max-w-md mx-auto p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header with Create Chat Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Chats</h1>
            <p className="text-sm text-gray-600">Your conversations</p>
          </div>
          <button
            onClick={() => router.push('/invite')}
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 active:scale-95 transition-all shadow-lg hover:shadow-xl"
            title="Create new chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Chats List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative w-12 h-12 mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-20 animate-pulse"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600"></div>
            </div>
            <p className="text-gray-500 font-medium">Loading chats...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl shadow-sm border border-gray-100">
            <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">No chats yet</h3>
            <p className="text-sm text-gray-600 mb-4">Start a conversation with your friends</p>
            <button
              onClick={() => router.push('/invite')}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              Create New Chat
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {chats.map((chat, index) => {
              const hasUnread = (chat.unreadCount || 0) > 0 || chat.isNew;

              // Get active bets count
              const chatMarkets = getMarketsForChat(chat.chatId);
              const activeBetsCount = chatMarkets.filter(
                (m) => !m.runtime.status.resolved && !m.runtime.status.cancelled
              ).length;

              // Generate consistent random gradient for each chat based on chatId
              const gradients = [
                "from-purple-500 to-pink-500",
                "from-blue-500 to-cyan-500",
                "from-green-500 to-emerald-500",
                "from-red-500 to-pink-500",
                "from-amber-500 to-orange-500",
                "from-indigo-500 to-purple-500",
                "from-rose-500 to-red-500",
                "from-teal-500 to-cyan-500",
                "from-violet-500 to-indigo-500",
                "from-fuchsia-500 to-purple-500",
              ];
              const gradientIndex = chat.chatId.charCodeAt(0) % gradients.length;
              const gradient = gradients[gradientIndex];

              return (
                <div
                  key={chat.chatId}
                  onClick={() => {
                    // Clear the new flag when opening chat
                    const updatedChat = { ...chat, isNew: false };
                    setChats(prev =>
                      prev.map(c => c.chatId === chat.chatId ? updatedChat : c)
                    );
                    router.push(`/chats/${chat.chatId}`);
                  }}
                  className={`bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-blue-200 active:scale-98 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    hasUnread ? 'ring-1 ring-blue-500 ring-opacity-50' : ''
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Chat Icon with Random Gradient */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md bg-gradient-to-br ${gradient} ${
                      hasUnread ? 'animate-pulse' : ''
                    }`}>
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3
                            className={`text-sm truncate ${
                              hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                            }`}
                          >
                            {chat.chatName}
                          </h3>
                          {activeBetsCount > 0 && (
                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-md flex-shrink-0">
                              <TrendingUp className="h-3 w-3" />
                              <span className="text-xs font-bold">
                                {activeBetsCount} ACTIVE BET{activeBetsCount > 1 ? 'S' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`text-xs flex-shrink-0 ml-2 ${
                          hasUnread ? 'font-semibold text-blue-600' : 'text-gray-500'
                        }`}>
                          {formatTimestamp(chat.lastMessageTime || chat.createdAt)}
                        </span>
                      </div>

                      {/* Member Avatars */}
                      <div className="flex items-center gap-0 mb-1">
                        {chat.memberWallets.slice(0, 3).map((wallet, index) => {
                          const profile = chat.memberProfiles?.[wallet];
                          return (
                            <div
                              key={wallet}
                              className="relative"
                              style={{
                                marginLeft: index === 0 ? 0 : "-6px",
                                zIndex: 10 - index,
                              }}
                            >
                              {profile?.pfp ? (
                                <img
                                  src={profile.pfp}
                                  alt={profile.username}
                                  className="w-5 h-5 rounded-full border border-white object-cover shadow-sm"
                                  title={profile.username}
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-white bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                  {(profile?.display_name || wallet.slice(0, 6)).charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* +N indicator if more than 3 members */}
                        {chat.memberWallets.length > 3 && (
                          <div className="w-5 h-5 rounded-full border border-white bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700 shadow-sm -ml-1.5">
                            +{chat.memberWallets.length - 3}
                          </div>
                        )}
                      </div>

                      <p
                        className={`text-xs truncate ${
                          hasUnread ? 'font-bold text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>

                    {/* New Message Indicator */}
                    {hasUnread && (
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0 mt-1 shadow-lg animate-pulse"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
