import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export function useWebSocket(sessionId, onMessage) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!sessionId) return;

    try {
      ws.current = new WebSocket(`${WS_URL}/ws/visitor/${sessionId}`);

      ws.current.onopen = () => {
        setConnected(true);
        // Init conversation
        ws.current.send(JSON.stringify({ type: 'init' }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current(data);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
        // Auto reconnect after 3 seconds
        setTimeout(() => {
          setReconnectCount(c => c + 1);
        }, 3000);
      };

      ws.current.onerror = (err) => {
        console.error('WS error:', err);
        ws.current?.close();
      };
    } catch (e) {
      console.error('WS connect error:', e);
    }
  }, [sessionId, reconnectCount]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { send, connected };
}
