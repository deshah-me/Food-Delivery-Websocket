import { useEffect, useState } from 'react';

export function useNotificationSocket(webSocketUrl, onNotification) {
  const [connectionState, setConnectionState] = useState('connecting');

  useEffect(() => {
    let reconnectTimer;
    let manuallyClosed = false;
    let socket;

    function connect() {
      setConnectionState('connecting');
      socket = new WebSocket(webSocketUrl);

      socket.onopen = () => setConnectionState('connected');
      socket.onerror = () => setConnectionState('disconnected');
      socket.onclose = () => {
        setConnectionState('disconnected');
        if (!manuallyClosed) {
          reconnectTimer = window.setTimeout(connect, 1500);
        }
      };
      socket.onmessage = (event) => {
        onNotification(JSON.parse(event.data));
      };
    }

    connect();

    return () => {
      manuallyClosed = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [onNotification, webSocketUrl]);

  return connectionState;
}
