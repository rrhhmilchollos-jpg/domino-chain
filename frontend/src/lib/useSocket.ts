import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API } from './shared';

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(API, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return globalSocket;
}

export function useSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    if (userId) socket.emit('join', userId);
    return () => {};
  }, [userId]);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return { socket: socketRef.current, emit, on };
}

export interface BotSpeakEvent {
  liveId: string;
  botUsername: string;
  text: string;
  animation: 'talking' | 'excited' | 'dancing' | 'idle';
  duration: number;
  timestamp: string;
}

export function useLiveSocket(liveId: string, handlers: {
  onMessage?: (msg: any) => void;
  onGift?: (data: any) => void;
  onFloat?: (data: any) => void;
  onEnded?: () => void;
  onViewerCount?: (count: number) => void;
  // ─── Seguimiento 1: bot_speak — TTS sincronizado ───────────────────────
  onBotSpeak?: (data: BotSpeakEvent) => void;
}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!liveId) return;
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('join_live', liveId);

    if (handlers.onMessage) socket.on('live_message', handlers.onMessage);
    if (handlers.onGift) socket.on('live_gift', handlers.onGift);
    if (handlers.onFloat) socket.on('live_float', handlers.onFloat);
    if (handlers.onEnded) socket.on('live_ended', handlers.onEnded);
    if (handlers.onViewerCount) socket.on('live_viewer_count', handlers.onViewerCount);
    // ─── Seguimiento 1: escuchar bot_speak ──────────────────────────────
    if (handlers.onBotSpeak) socket.on('bot_speak', handlers.onBotSpeak);

    return () => {
      socket.emit('leave_live', liveId);
      if (handlers.onMessage) socket.off('live_message', handlers.onMessage);
      if (handlers.onGift) socket.off('live_gift', handlers.onGift);
      if (handlers.onFloat) socket.off('live_float', handlers.onFloat);
      if (handlers.onEnded) socket.off('live_ended', handlers.onEnded);
      if (handlers.onViewerCount) socket.off('live_viewer_count', handlers.onViewerCount);
      if (handlers.onBotSpeak) socket.off('bot_speak', handlers.onBotSpeak);
    };
  }, [liveId]);

  const sendMessage = useCallback((msg: { user: string; userId: string; avatarUrl?: string; text: string; type?: string }) => {
    socketRef.current?.emit('live_message', { ...msg, liveId });
  }, [liveId]);

  const sendFloat = useCallback((data: { text: string; emoji: string; user: string }) => {
    socketRef.current?.emit('live_float', { ...data, liveId });
  }, [liveId]);

  return { sendMessage, sendFloat };
}
