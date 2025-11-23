/**
 * Optimistic Messaging Hook
 * A discrete WebSocket-based messaging system that works alongside XMTP
 * Provides real-time message delivery with local persistence
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface OptimisticMessage {
  id: string;
  chat_id: string;
  user_id?: string;
  username?: string;
  wallet?: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'sending' | 'failed';
}

export interface OptimisticMessagingConfig {
  serverUrl?: string;
  userId?: string;
  username?: string;
  wallet?: string;
  chatId?: string;
}

export const useOptimisticMessaging = (config: OptimisticMessagingConfig) => {
  const {
    serverUrl = 'https://optim-api.ngrok-free.dev',
    userId,
    username,
    wallet,
    chatId,
  } = config;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    const socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to optimistic messaging server');
      setIsConnected(true);
      setError(null);

      // Register user
      socket.emit('register_user', {
        user_id: userId,
        username,
        wallet,
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from optimistic messaging server');
      setIsConnected(false);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(typeof err === 'string' ? err : 'Connection error');
    });

    // Message events
    socket.on('new_message', (message: OptimisticMessage) => {
      setMessages(prev => {
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    });

    socket.on('chat_joined', (data) => {
      setMessages(data.messages || []);
    });

    socket.on('user_typing', (data) => {
      console.log('User typing:', data.username);
    });

    socket.on('new_chat_created', (data) => {
      // Chat broadcast event handled by caller
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, serverUrl, username, wallet]);

  // Join chat when chatId changes
  useEffect(() => {
    if (!socketRef.current || !chatId || !isConnected) return;

    socketRef.current.emit('join_chat', {
      chat_id: chatId,
      user_id: userId,
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_chat', {
          chat_id: chatId,
          user_id: userId,
        });
      }
    };
  }, [chatId, userId, isConnected]);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!socketRef.current || !isConnected || !chatId) {
        setError('Not connected to messaging server');
        return null;
      }

      try {
        socketRef.current.emit('send_message', {
          chat_id: chatId,
          user_id: userId,
          content,
          username,
          wallet,
        });

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        return false;
      }
    },
    [socketRef, isConnected, chatId, userId, username, wallet]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current || !chatId) return;

      socketRef.current.emit('typing', {
        chat_id: chatId,
        user_id: userId,
        username,
        is_typing: isTyping,
      });
    },
    [socketRef, chatId, userId, username]
  );

  // Load chat history
  const loadChatHistory = useCallback(
    async (cid: string) => {
      try {
        setIsLoading(true);
        const response = await fetch(`${serverUrl}/api/messages/${cid}`);
        const data = await response.json();
        setMessages(data.messages || []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [serverUrl]
  );

  return {
    isConnected,
    messages,
    isLoading,
    error,
    sendMessage,
    sendTyping,
    loadChatHistory,
  };
};
