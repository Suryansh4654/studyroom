import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

const getValidToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    
    if (now < exp - 15) {
      return token;
    }
  } catch (e) {
    // parsing error, fallback to refresh
  }

  if (refreshToken) {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const res = await axios.post(`${apiBaseUrl}/auth/token/refresh/`, {
        refresh: refreshToken,
      });
      if (res.status === 200 && res.data.access) {
        const newAccess = res.data.access;
        localStorage.setItem('access_token', newAccess);
        console.log('[WebSocket Auth] Token successfully auto-refreshed.');
        return newAccess;
      }
    } catch (err) {
      console.error('[WebSocket Auth Error] Failed to refresh token:', err);
    }
  }

  return token;
};

export const useWebSocket = (
  roomId: string | undefined,
  onMessageReceived: (message: WebSocketMessage) => void
) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const reconnectTimeout = useRef<number | null>(null);
  const forceClose = useRef<boolean>(false);

  const connect = useCallback(async () => {
    if (!roomId) return;
    
    forceClose.current = false;
    const token = await getValidToken();
    if (!token) return;

    // detect correct host for WS connection
    let wsUrlBase = import.meta.env.VITE_WS_BASE_URL;
    let apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

    // Automatically correct common environment typos (e.g. '.onrender.ws' instead of '.onrender.com')
    if (wsUrlBase && wsUrlBase.includes('.onrender.ws')) {
      wsUrlBase = wsUrlBase.replace('.onrender.ws', '.onrender.com');
    }
    if (apiBaseUrl && apiBaseUrl.includes('.onrender.ws')) {
      apiBaseUrl = apiBaseUrl.replace('.onrender.ws', '.onrender.com');
    }

    // Ensure wsUrlBase is not empty and has a protocol
    if (wsUrlBase) {
      if (!wsUrlBase.startsWith('ws:') && !wsUrlBase.startsWith('wss:')) {
        const isSecure = window.location.protocol === 'https:';
        wsUrlBase = (isSecure ? 'wss://' : 'ws://') + wsUrlBase;
      }
      // Ensure it ends with /ws path segment
      if (!wsUrlBase.endsWith('/ws') && !wsUrlBase.endsWith('/ws/')) {
        wsUrlBase = wsUrlBase.replace(/\/+$/, '') + '/ws';
      }
    }

    // Check if the configured WS url is default, missing, or localhost
    const isLocalhostWs = !wsUrlBase || wsUrlBase === 'ws://localhost:8000/ws' || wsUrlBase.includes('localhost') || wsUrlBase.includes('127.0.0.1');

    if (isLocalhostWs) {
      const isCurrentHostProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

      if (isCurrentHostProduction) {
        // Derive from API base URL if it's set to a production host
        if (apiBaseUrl && !apiBaseUrl.includes('localhost') && !apiBaseUrl.includes('127.0.0.1')) {
          wsUrlBase = apiBaseUrl
            .replace(/^http:/i, 'ws:')
            .replace(/^https:/i, 'wss:')
            .replace(/\/api\/?$/i, '/ws');
        } else {
          // If no API URL is set or it's localhost, fall back to current production host same origin /ws
          const isSecure = window.location.protocol === 'https:';
          const protocol = isSecure ? 'wss:' : 'ws:';
          wsUrlBase = `${protocol}//${window.location.hostname}/ws`;
        }
      } else {
        // We are locally testing on localhost, keep port 8000
        const isSecure = window.location.protocol === 'https:';
        const protocol = isSecure ? 'wss:' : 'ws:';
        wsUrlBase = `${protocol}//${window.location.hostname}:8000/ws`;
      }
    }

    const wsUrl = `${wsUrlBase}/room/${roomId}/?token=${token}`;
    console.log(`[WebSocket Connect] Initiating connection to: ${wsUrl}`);

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log('[WebSocket Connected] Connection established.');
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
        console.log('[WebSocket Reconnect] Scheduling retry in 3 seconds...');
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
