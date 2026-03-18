import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { appStore } from '@shared/model/app_store/AppStore';

import { configLoader } from '../../../config/configLoader';

interface SocketContextType {
  lastMessage: any;
  stompClient: any;
  isConnected: boolean;
  connectionStatus: string;
  currentBranchId: string | null;
  unreadCount: number;
  dialogsUnreadCounts: Map<number, number>;
  setUnreadCount: (count: number) => void;
  updateDialogUnreadCount: (dialogId: number, count: number) => void;
  calculateTotalUnread: () => number;
  resetDialogCounts: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dialogsUnreadCounts, setDialogsUnreadCounts] = useState<Map<number, number>>(new Map());

  const stompClientRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const socketRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const useDetailedCountsRef = useRef<boolean>(false);
  const hasDetailedDataRef = useRef<boolean>(false);

  const [apiConfig, setApiConfig] = useState<{ apiUrl: string; wsUrl: string } | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await configLoader.loadConfig();
        setApiConfig(config);
      } catch (error) {
        console.error('Ошибка загрузки конфигурации WebSocket:', error);
        setApiConfig({
          apiUrl: 'https://alcolock-test.lsystems.ru/',
          wsUrl: 'wss://alcolock-test.lsystems.ru/ws/websocket',
        });
      }
    };

    loadConfig();
  }, []);

  const getAuthToken = (): string | null => {
    const tokenFromLocalStorage = localStorage.getItem('authToken');
    const tokenFromSessionStorage = sessionStorage.getItem('authToken');
    const tokenFromCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('bearer='))
      ?.split('=')[1];

    return tokenFromLocalStorage || tokenFromSessionStorage || tokenFromCookie || null;
  };

  const getBranchId = (): string | null => {
    const branchState = appStore.getState().selectedBranchState;
    return branchState?.id ? branchState.id.toString() : null;
  };

  const resetDialogCounts = useCallback(() => {
    setDialogsUnreadCounts(new Map());
    useDetailedCountsRef.current = false;
    hasDetailedDataRef.current = false;
  }, []);

  const calculateTotalUnread = useCallback((): number => {
    if (!useDetailedCountsRef.current || !hasDetailedDataRef.current) {
      return unreadCount;
    }

    let total = 0;
    dialogsUnreadCounts.forEach((count, dialogId) => {
      if (dialogId > 0 && count > 0) {
        total += count;
      }
    });
    return total;
  }, [dialogsUnreadCounts, unreadCount]);

  const updateDialogUnreadCount = useCallback((dialogId: number, count: number) => {
    console.log(`💬 WebSocket: Обновление счётчика для диалога ${dialogId}: ${count}`);
    setDialogsUnreadCounts((prev) => {
      const newMap = new Map(prev);
      if (useDetailedCountsRef.current || dialogId > 0) {
        newMap.set(dialogId, count);
      }
      return newMap;
    });
  }, []);

  const updateUnreadCountDirect = useCallback((count: number) => {
    console.log(`💬 WebSocket: Общий счётчик непрочитанных: ${count}`);
    setUnreadCount(count);
  }, []);

  const sendStompFrame = (command: string, headers: any = {}, body: string = '') => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    let frame = `${command}\n`;
    Object.keys(headers).forEach((key) => {
      frame += `${key}:${headers[key]}\n`;
    });
    frame += `\n${body}\x00`;

    try {
      socketRef.current.send(frame);
      return true;
    } catch (error) {
      return false;
    }
  };

  const disconnectWebSocket = () => {
    if (socketRef.current) {
      sendStompFrame('DISCONNECT');
      socketRef.current.close(1000, 'Смена филиала');
      socketRef.current = null;
    }

    if (stompClientRef.current) {
      stompClientRef.current.connected = false;
      stompClientRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    isConnectingRef.current = false;
    subscriptionsRef.current.clear();
    processedMessagesRef.current.clear();
    setUnreadCount(0);
    resetDialogCounts();
  };

  const parseStompFrame = (data: string) => {
    const lines = data.split('\n');
    const command = lines[0];
    const headers: any = {};
    let body = '';
    let i = 1;

    while (i < lines.length && lines[i] !== '') {
      const headerLine = lines[i];
      const separatorIndex = headerLine.indexOf(':');
      if (separatorIndex !== -1) {
        headers[headerLine.substring(0, separatorIndex)] = headerLine.substring(separatorIndex + 1);
      }
      i++;
    }

    i++;
    while (i < lines.length) {
      if (lines[i] === '\x00' || lines[i].endsWith('\x00')) {
        if (lines[i].length > 1) {
          body += lines[i].substring(0, lines[i].length - 1);
        }
        break;
      }
      body += lines[i];
      i++;
    }

    if (!body && data.includes('\x00')) {
      const bodyStart = data.indexOf('\n\n');
      if (bodyStart !== -1) {
        const bodyEnd = data.indexOf('\x00');
        if (bodyEnd !== -1) {
          body = data.substring(bodyStart + 2, bodyEnd);
        }
      }
    }

    return { command, headers, body };
  };

  const subscribeToTopics = (currentBranchId: string) => {
    const topics = [
      `/topic/operator/messages/${currentBranchId}`,
      '/user/queue/messages',
      `/queue/unread/${currentBranchId}`,
      '/user/queue/unread',
      `/topic/dialog/status/${currentBranchId}`,
      '/user/queue/errors',
      '/user/queue/status',
    ];

    console.log('🔌 WebSocket: Активирую подписки:');
    topics.forEach((topic) => {
      console.log(`  📡 ${topic}`);
    });

    subscriptionsRef.current.clear();
    topics.forEach((topic) => {
      const subscribeHeaders = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        destination: topic,
      };
      sendStompFrame('SUBSCRIBE', subscribeHeaders);
      subscriptionsRef.current.add(topic);
    });
  };

  const connectWebSocket = (branchId: string) => {
    if (isConnectingRef.current || !apiConfig) return;

    disconnectWebSocket();
    setConnectionStatus('connecting');
    setCurrentBranchId(branchId);
    isConnectingRef.current = true;

    const { apiUrl, wsUrl: configWsUrl } = apiConfig;
    let wsUrl = configWsUrl;

    if (!wsUrl && apiUrl) {
      wsUrl = apiUrl.replace('http', 'ws').replace('https', 'wss') + 'ws/websocket';
    }

    if (!wsUrl) {
      setConnectionStatus('error');
      isConnectingRef.current = false;
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setConnectionStatus('error');
      isConnectingRef.current = false;
      return;
    }

    try {
      const finalWsUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;
      const socket = new WebSocket(finalWsUrl);
      socketRef.current = socket;

      const stompClient = {
        connected: false,
        webSocket: socket,
        subscribe: (destination: string) => {
          const subscribeHeaders = {
            id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            destination,
          };
          sendStompFrame('SUBSCRIBE', subscribeHeaders);
          subscriptionsRef.current.add(destination);
        },
        publish: ({
          destination,
          body,
          headers = {},
        }: {
          destination: string;
          body: string;
          headers?: any;
        }) => {
          if (!stompClient.connected) return false;
          const sendHeaders = { destination, ...headers };
          return sendStompFrame('SEND', sendHeaders, body);
        },
        deactivate: () => {
          disconnectWebSocket();
        },
      };

      stompClientRef.current = stompClient;

      socket.onopen = () => {
        sendStompFrame('CONNECT', {
          'accept-version': '1.1,1.0',
          'heart-beat': '10000,10000',
        });
      };

      socket.onmessage = (event) => {
        try {
          const frame = parseStompFrame(event.data);

          if (frame.command === 'CONNECTED') {
            setIsConnected(true);
            setConnectionStatus('connected');
            stompClient.connected = true;
            isConnectingRef.current = false;

            setTimeout(() => {
              subscribeToTopics(branchId);
            }, 100);
            return;
          }

          if (frame.command === 'MESSAGE') {
            const cleanedBody = frame.body.replace(/\0/g, '').trim();
            if (!cleanedBody) return;

            const messageId = `${frame.headers.destination}_${cleanedBody}`;
            if (processedMessagesRef.current.has(messageId)) return;
            processedMessagesRef.current.add(messageId);

            setTimeout(() => {
              processedMessagesRef.current.delete(messageId);
            }, 10000);

            try {
              const parsedBody = JSON.parse(cleanedBody);
              const destination = frame.headers.destination || frame.headers.Destination;

              if (destination === '/user/queue/errors') {
                setLastMessage({
                  data: parsedBody,
                  type: 'error',
                  rawBody: cleanedBody,
                  destination: destination,
                });
                return;
              }

              if (destination === '/user/queue/unread') {
                if (parsedBody && typeof parsedBody.countUnMessages === 'number') {
                  if (!(useDetailedCountsRef.current && hasDetailedDataRef.current)) {
                    useDetailedCountsRef.current = false;
                    hasDetailedDataRef.current = false;
                    updateUnreadCountDirect(parsedBody.countUnMessages);
                  }
                }
              } else if (destination === `/queue/unread/${currentBranchId}`) {
                if (Array.isArray(parsedBody)) {
                  const hasRealDialogs = parsedBody.some(
                    (item: any) =>
                      item.dialogId && item.dialogId > 0 && item.countUnMessages !== undefined,
                  );

                  if (hasRealDialogs) {
                    useDetailedCountsRef.current = true;
                    hasDetailedDataRef.current = true;
                    parsedBody.forEach((dialogData: any) => {
                      if (dialogData.dialogId && typeof dialogData.countUnMessages === 'number') {
                        updateDialogUnreadCount(dialogData.dialogId, dialogData.countUnMessages);
                      }
                    });
                  } else {
                    const firstItem = parsedBody[0];
                    if (firstItem && typeof firstItem.countUnMessages === 'number') {
                      useDetailedCountsRef.current = false;
                      hasDetailedDataRef.current = false;
                      updateUnreadCountDirect(firstItem.countUnMessages);
                    }
                  }
                } else if (parsedBody?.dialogId && typeof parsedBody.countUnMessages === 'number') {
                  if (parsedBody.dialogId > 0) {
                    useDetailedCountsRef.current = true;
                    hasDetailedDataRef.current = true;
                    updateDialogUnreadCount(parsedBody.dialogId, parsedBody.countUnMessages);
                  }
                } else if (
                  parsedBody &&
                  typeof parsedBody.countUnMessages === 'number' &&
                  !parsedBody.dialogId
                ) {
                  if (!(useDetailedCountsRef.current && hasDetailedDataRef.current)) {
                    useDetailedCountsRef.current = false;
                    hasDetailedDataRef.current = false;
                    updateUnreadCountDirect(parsedBody.countUnMessages);
                  }
                }

                setLastMessage({
                  data: parsedBody,
                  type: 'DIALOGS_UPDATE',
                  rawBody: cleanedBody,
                  destination: destination,
                  forceRefresh: true,
                });
              } else if (destination === '/user/queue/messages') {
                if (parsedBody?.dialog?.id && parsedBody.messageStatus === 'TO_OPERATOR') {
                  if (useDetailedCountsRef.current && hasDetailedDataRef.current) {
                    const dialogId = parsedBody.dialog.id;
                    const currentCount = dialogsUnreadCounts.get(dialogId) || 0;
                    updateDialogUnreadCount(dialogId, currentCount + 1);
                  } else {
                    updateUnreadCountDirect(unreadCount + 1);
                  }
                }

                setLastMessage({
                  data: parsedBody,
                  type: destination,
                  rawBody: cleanedBody,
                  destination: destination,
                });
              } else if (destination === '/user/queue/status') {
                setLastMessage({
                  data: parsedBody,
                  type: 'STATUS_UPDATE',
                  rawBody: cleanedBody,
                  destination: destination,
                });
              } else if (destination === `/topic/dialog/status/${currentBranchId}`) {
                setLastMessage({
                  data: parsedBody,
                  type: 'DIALOG_STATUS_UPDATE',
                  rawBody: cleanedBody,
                  destination: destination,
                });
              } else if (destination === `/topic/operator/messages/${currentBranchId}`) {
                setLastMessage({
                  data: parsedBody,
                  type: 'OPERATOR_MESSAGE',
                  rawBody: cleanedBody,
                  destination: destination,
                });
              } else {
                setLastMessage({
                  data: parsedBody,
                  type: destination,
                  rawBody: cleanedBody,
                  destination: destination,
                });
              }
            } catch (parseError) {
              if (frame.headers.destination === '/user/queue/errors') {
                setLastMessage({
                  data: { message: cleanedBody, type: 'PARSE_ERROR' },
                  type: 'error',
                  rawBody: cleanedBody,
                });
              } else {
                setLastMessage({
                  data: cleanedBody,
                  type: frame.headers.destination,
                  rawBody: cleanedBody,
                });
              }
            }
          } else if (frame.command === 'ERROR') {
            setLastMessage({ type: 'error', data: frame });
            setConnectionStatus('error');
            isConnectingRef.current = false;
          }
        } catch (error) {
          console.error('Ошибка парсинга сообщения WebSocket:', error);
        }
      };

      socket.onerror = (error) => {
        setIsConnected(false);
        setConnectionStatus('error');
        stompClient.connected = false;
        isConnectingRef.current = false;
        setLastMessage({ type: 'connection_error', data: error });

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          const currentBranch = getBranchId();
          if (currentBranch) connectWebSocket(currentBranch);
        }, 5000);
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        stompClient.connected = false;
        isConnectingRef.current = false;
        subscriptionsRef.current.clear();
        processedMessagesRef.current.clear();
        setLastMessage({
          type: 'connection_closed',
          data: { code: event.code, reason: event.reason, branchId },
        });

        if (event.code !== 1000 && event.reason !== 'Смена филиала') {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            const currentBranch = getBranchId();
            if (currentBranch) connectWebSocket(currentBranch);
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Ошибка создания WebSocket:', error);
      setConnectionStatus('error');
      isConnectingRef.current = false;
    }
  };

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      const newBranchId = getBranchId();
      if (newBranchId && newBranchId !== currentBranchId && apiConfig) {
        connectWebSocket(newBranchId);
      }
    });

    const initializeWithRetry = (attempt = 0) => {
      if (attempt > 5) return;
      const initialBranchId = getBranchId();
      if (initialBranchId && apiConfig) {
        connectWebSocket(initialBranchId);
      } else if (!apiConfig) {
        setTimeout(() => initializeWithRetry(attempt), 500);
      } else {
        setTimeout(() => initializeWithRetry(attempt + 1), 500);
      }
    };

    const initTimeout = setTimeout(() => {
      if (apiConfig) initializeWithRetry();
    }, 1000);

    return () => {
      clearTimeout(initTimeout);
      unsubscribe();
      disconnectWebSocket();
    };
  }, [apiConfig]);

  return (
    <SocketContext.Provider
      value={{
        lastMessage,
        stompClient: stompClientRef.current,
        isConnected,
        connectionStatus,
        currentBranchId,
        unreadCount,
        dialogsUnreadCounts,
        setUnreadCount: updateUnreadCountDirect,
        updateDialogUnreadCount,
        calculateTotalUnread,
        resetDialogCounts,
      }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
