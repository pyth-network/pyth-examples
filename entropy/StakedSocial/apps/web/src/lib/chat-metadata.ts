// User profile information
export interface UserProfile {
  username: string;
  pfp: string;
  display_name: string;
}

// Chat metadata types
export interface ChatMetadata {
  chatId: string;
  groupId: string;
  chatName: string;
  createdAt: number;
  createdBy: string; // wallet address
  memberWallets: string[]; // array of wallet addresses
  memberInboxIds: string[]; // array of inbox IDs
  memberProfiles?: Record<string, UserProfile>; // wallet -> user profile mapping
  lastMessageTime?: number;
  lastMessage?: string;
  lastMessageSender?: string; // wallet address of last message sender
  unreadCount?: number;
  isNew?: boolean; // whether this chat has new unread messages
}

export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;
  senderAddress: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'failed';
  type?: 'message' | 'bet'; // Default is 'message'
  marketId?: string; // For bet messages
}

// LocalStorage keys
const CHATS_KEY = 'xmtp_chats';
const MESSAGES_KEY_PREFIX = 'xmtp_messages_';

// Get all chats from localStorage
export const getAllChats = (): ChatMetadata[] => {
  if (typeof window === 'undefined') return [];

  try {
    const chatsJson = localStorage.getItem(CHATS_KEY);
    if (!chatsJson) return [];
    return JSON.parse(chatsJson);
  } catch (error) {
    console.error('Error loading chats:', error);
    return [];
  }
};

// Get a specific chat by ID
export const getChatById = (chatId: string): ChatMetadata | null => {
  const chats = getAllChats();
  return chats.find(chat => chat.chatId === chatId) || null;
};

// Save a new chat
export const saveChat = (chat: ChatMetadata): void => {
  if (typeof window === 'undefined') return;

  try {
    const chats = getAllChats();
    const existingIndex = chats.findIndex(c => c.chatId === chat.chatId);

    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.push(chat);
    }

    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving chat:', error);
  }
};

// Update chat metadata
export const updateChat = (chatId: string, updates: Partial<ChatMetadata>): void => {
  if (typeof window === 'undefined') return;

  try {
    const chats = getAllChats();
    const chatIndex = chats.findIndex(c => c.chatId === chatId);

    if (chatIndex >= 0) {
      chats[chatIndex] = { ...chats[chatIndex], ...updates };
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    }
  } catch (error) {
    console.error('Error updating chat:', error);
  }
};

// Delete a chat
export const deleteChat = (chatId: string): void => {
  if (typeof window === 'undefined') return;

  try {
    const chats = getAllChats();
    const filteredChats = chats.filter(c => c.chatId !== chatId);
    localStorage.setItem(CHATS_KEY, JSON.stringify(filteredChats));

    // Also delete messages for this chat
    localStorage.removeItem(MESSAGES_KEY_PREFIX + chatId);
  } catch (error) {
    console.error('Error deleting chat:', error);
  }
};

// Get messages for a chat
export const getChatMessages = (chatId: string): ChatMessage[] => {
  if (typeof window === 'undefined') return [];

  try {
    const messagesJson = localStorage.getItem(MESSAGES_KEY_PREFIX + chatId);
    if (!messagesJson) return [];
    return JSON.parse(messagesJson);
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
};

// Save a message
export const saveMessage = (message: ChatMessage): void => {
  if (typeof window === 'undefined') return;

  try {
    const messages = getChatMessages(message.chatId);
    const existingIndex = messages.findIndex(m => m.id === message.id);

    if (existingIndex >= 0) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }

    localStorage.setItem(MESSAGES_KEY_PREFIX + message.chatId, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving message:', error);
  }
};

// Update message status
export const updateMessageStatus = (
  chatId: string,
  messageId: string,
  status: ChatMessage['status']
): void => {
  if (typeof window === 'undefined') return;

  try {
    const messages = getChatMessages(chatId);
    const messageIndex = messages.findIndex(m => m.id === messageId);

    if (messageIndex >= 0) {
      messages[messageIndex].status = status;
      localStorage.setItem(MESSAGES_KEY_PREFIX + chatId, JSON.stringify(messages));
    }
  } catch (error) {
    console.error('Error updating message status:', error);
  }
};

// Export metadata as JSON for server upload
export const exportMetadataForServer = (): string => {
  const chats = getAllChats();
  const allData: { chats: ChatMetadata[], messages: Record<string, ChatMessage[]> } = {
    chats,
    messages: {}
  };

  chats.forEach(chat => {
    allData.messages[chat.chatId] = getChatMessages(chat.chatId);
  });

  return JSON.stringify(allData, null, 2);
};
