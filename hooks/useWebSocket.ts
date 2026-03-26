"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketHook {
  isConnected: boolean;
  send: (data: string | object) => void;
  lastMessage: MessageEvent | null;
}

export function useWebSocket(url: string): WebSocketHook {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        setLastMessage(event);
      };

      ws.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket connection failed (e.g. in mock/dev environment)
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: string | object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = typeof data === "string" ? data : JSON.stringify(data);
      socketRef.current.send(message);
    }
  }, []);

  return { isConnected, send, lastMessage };
}
