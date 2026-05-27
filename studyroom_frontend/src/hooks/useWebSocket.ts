import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (
  roomId: string | undefined,
  onMessageReceived: (message: WebSocketMessage) => void
) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const reconnectTimeout = useRef<number | null>(null);
  const forceClose = useRef<boolean>(false);

  const connect = useCallback(() => {
    if (!roomId) return;
    
    forceClose.current = false;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Smart Dynamic Host Detection to prevent localhost vs 127.0.0.1 mismatches
    let wsUrlBase = import.meta.env.VITE_WS_BASE_URL;
    if (!wsUrlBase || wsUrlBase === 'ws://localhost:8000/ws') {
      const isSecure = window.location.protocol === 'https:';
      const protocol = isSecure ? 'wss:' : 'ws:';
      const hostname = window.location.hostname; // E.g. 'localhost' or '127.0.0.1'
      wsUrlBase = `${protocol}//${hostname}:8000/ws`;
    }

    const wsUrl = `${wsUrlBase}/room/${roomId}/?token=${token}`;
    console.log(`[WebSocket Connect] Initiating connection to: ${wsUrl}`);

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log("[WebSocket Connected] Connection established.");
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageReceived(data);
      } catch (err) {
        console.error('[WebSocket Message Error] Error parsing message:', err);
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      console.log(`[WebSocket Closed] Connection terminated (code: ${event.code}).`);
      
      // Auto-reconnect if not explicitly closed and not unauthorized
      if (!forceClose.current && event.code !== 4001 && event.code !== 4003) {
        console.log("[WebSocket Reconnect] Scheduling retry in 3 seconds...");
        reconnectTimeout.current = window.setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    socket.onerror = (error) => {
      console.error('[WebSocket Error] Connection encountered an issue:', error);
    };
  }, [roomId, onMessageReceived]);

  useEffect(() => {
    connect();

    return () => {
      forceClose.current = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket Warning] Cannot send message: Connection is currently offline.');
    }
  }, []);

  return { isConnected, sendMessage };
};
