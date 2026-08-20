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
import { getBearerToken } from '@shared/utils/cookie_manager';

import {
  DESKTOP_AUTH_READY_EVENT,
  isElectronOperatorChatPopup,
  notifyDesktopAuthReady,
  syncElectronOperatorChatPopupAuthFromUrl,
} from '../chatPopup/electronPopupAuth';
import { DESKTOP_BRANCH_READY_EVENT } from '../chatPopup/electronPopupSessionBootstrap';
import { resolveChatWebSocketUrl } from '../chatPopup/electronWebSocketUrl';
import { isElectronChatShell } from '../chatPopup/chatShellEnvironment';
import {
  clearDesktopSocketUnreadHandoffMarker,
  peekDesktopSocketUnreadHandoff,
} from '../chatPopup/mainChatOpenRestoreFromPopup';
import { configLoader } from '../../../config/configLoader';
import { isPayloadForCurrentOperatorBranch } from '../lib/chatBranchGuard';
import { operatorUnreadDebug } from '../lib/operatorUnreadDebugLog';
import {
  setStompDebugFromRuntimeConfig,
  stompDebugLog,
  stompDebugMaskWsUrl,
  websocketReadyStateLabel,
} from '../lib/stompDebugLog';
import { chatUnreadTrace, unreadMapToRecord } from './chatUnreadTrace';

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
  /** Пересчёт из ленты сессии: с prev из актуальной Map — иначе гонка с абсолютным WS затирает счётчик нулём при пустой ленте. */
  reconcileDialogUnreadFromSessionFeed: (
    dialogId: number,
    feedUnreadCount: number,
    hasAnyMessageForDialog: boolean,
    onApplied: (next: number, prevSocket: number) => void,
  ) => void;
  /** Слияние снимка из REST: не затираем локальный счётчик нулём, пока агрегат по WS больше нуля (устаревший API). */
  mergeDialogUnreadFromApi: (dialogId: number, apiCount: number) => void;
  incrementDialogUnreadCount: (dialogId: number, amount?: number, dedupeKey?: string) => void;
  /** REST непрочитанных текущего филиала: бейдж только по этим dialogId (WS-топик филиала часто шире). */
  restrictUnreadCountsToDialogIds: (dialogIds: number[]) => void;
  calculateTotalUnread: () => number;
  resetDialogCounts: () => void;
  /** Отправка через актуальный STOMP-клиент (ref), без гонки с React state. */
  publishStompMessage: (
    destination: string,
    body: string,
    headers?: Record<string, string>,
  ) => boolean;
  /** Снимает и очищает очередь входящих сообщений чата (OPERATOR / user queue), чтобы не терять их при перезаписи lastMessage. */
  flushIncomingChatMessages: () => any[];
}

const SocketContext = createContext<SocketContextType | null>(null);

function readInitialElectronPopupUnreadState(): {
  unreadCount: number;
  dialogsUnreadCounts: Map<number, number>;
  sessionUnread: Map<string, number>;
  hasHandoff: boolean;
} {
  if (!isElectronOperatorChatPopup()) {
    return {
      unreadCount: 0,
      dialogsUnreadCounts: new Map(),
      sessionUnread: new Map(),
      hasHandoff: false,
    };
  }
  const handoff = peekDesktopSocketUnreadHandoff();
  if (
    !handoff ||
    (handoff.dialogsUnreadCounts.size === 0 &&
      handoff.aggregateUnread <= 0 &&
      handoff.sessionUnread.size === 0)
  ) {
    return {
      unreadCount: 0,
      dialogsUnreadCounts: new Map(),
      sessionUnread: new Map(),
      hasHandoff: false,
    };
  }
  return {
    unreadCount: handoff.aggregateUnread,
    dialogsUnreadCounts: handoff.dialogsUnreadCounts,
    sessionUnread: handoff.sessionUnread,
    hasHandoff: true,
  };
}

export const SocketProvider = ({
  children,
  stompConnect = true,
}: {
  children: ReactNode;
  /** false — только контекст без WebSocket (внешний провайдер в index.tsx). */
  stompConnect?: boolean;
}) => {
  const initialUnreadState = readInitialElectronPopupUnreadState();
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(() => initialUnreadState.unreadCount);
  const [dialogsUnreadCounts, setDialogsUnreadCounts] = useState<Map<number, number>>(
    () => initialUnreadState.dialogsUnreadCounts,
  );

  const stompClientRef = useRef<any>(null);
  const [stompClient, setStompClient] = useState<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const currentBranchIdRef = useRef<string | null>(null);
  const activeWsBaseUrlRef = useRef<string | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const useDetailedCountsRef = useRef<boolean>(false);
  const hasDetailedDataRef = useRef<boolean>(false);
  const unreadAggregateRef = useRef<number>(0);
  const incomingChatMessagesQueueRef = useRef<any[]>([]);
  const lastAbsoluteDialogUpdateAtRef = useRef<Map<number, number>>(new Map());
  /** Предотвращает повторный +1 при двойном вызове handleIncomingMessage на одно сообщение. */
  const incrementDedupeByMessageRef = useRef<Set<string>>(new Set());
  /** dialogId, проверенные как пользователи текущего филиала (REST / live). */
  const allowedUnreadDialogIdsRef = useRef<Set<number>>(new Set());
  const unreadAllowlistReadyRef = useRef(false);

  const [apiConfig, setApiConfig] = useState<{ apiUrl: string; wsUrl: string } | null>(null);

  useEffect(() => {
    if (!initialUnreadState.hasHandoff) return;
    useDetailedCountsRef.current = true;
    hasDetailedDataRef.current = true;
    unreadAggregateRef.current = initialUnreadState.unreadCount;
  }, []);

  useEffect(() => {
    unreadAggregateRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await configLoader.loadConfig();
        stompDebugLog('config loaded', {
          apiUrl: config?.apiUrl,
          wsUrl: config?.wsUrl,
          resolvedWsUrl: config ? resolveChatWebSocketUrl(config) : undefined,
          windowLocationOrigin: window.location.origin,
          isElectron: typeof (window as any).alcolockDesktop !== 'undefined',
        });
        setApiConfig(config);
      } catch (error) {
        console.error('Ошибка загрузки конфигурации WebSocket:', error);
        setStompDebugFromRuntimeConfig(undefined);
        stompDebugLog('config load failed, using fallback URLs', { error: String(error) });
        setApiConfig({
          apiUrl: 'https://alcolock-test.lsystems.ru/',
          wsUrl: 'wss://alcolock-test.lsystems.ru/ws/websocket',
        });
      }
    };

    loadConfig();
  }, []);

  const getAuthToken = (): string | null => {
    const tokenFromCookie = getBearerToken();
    if (tokenFromCookie) return tokenFromCookie;

    const tokenFromLocalStorage = localStorage.getItem('authToken');
    const tokenFromSessionStorage = sessionStorage.getItem('authToken');

    return tokenFromLocalStorage || tokenFromSessionStorage || null;
  };

  const getBranchId = (): string | null => {
    const branchState = appStore.getState().selectedBranchState;
    return branchState?.id ? branchState.id.toString() : null;
  };

  const resetDialogCounts = useCallback(() => {
    setDialogsUnreadCounts(new Map());
    useDetailedCountsRef.current = false;
    hasDetailedDataRef.current = false;
    incrementDedupeByMessageRef.current.clear();
    lastAbsoluteDialogUpdateAtRef.current.clear();
    allowedUnreadDialogIdsRef.current = new Set();
    unreadAllowlistReadyRef.current = false;
  }, []);

  const flushIncomingChatMessages = useCallback((): any[] => {
    const q = incomingChatMessagesQueueRef.current;
    incomingChatMessagesQueueRef.current = [];
    return q;
  }, []);

  const calculateTotalUnread = useCallback((): number => {
    let mapSum = 0;
    dialogsUnreadCounts.forEach((count, dialogId) => {
      if (dialogId <= 0 || count <= 0) return;
      if (unreadAllowlistReadyRef.current && !allowedUnreadDialogIdsRef.current.has(dialogId)) {
        return;
      }
      if (!unreadAllowlistReadyRef.current) return;
      mapSum += count;
    });
    return mapSum;
  }, [dialogsUnreadCounts]);

  const restrictUnreadCountsToDialogIds = useCallback((dialogIds: number[]) => {
    unreadAllowlistReadyRef.current = true;
    allowedUnreadDialogIdsRef.current = new Set(
      dialogIds.filter((id) => typeof id === 'number' && id > 0),
    );
    setDialogsUnreadCounts((prev) => {
      const next = new Map<number, number>();
      prev.forEach((count, dialogId) => {
        if (allowedUnreadDialogIdsRef.current.has(dialogId)) {
          next.set(dialogId, count);
        }
      });
      return next;
    });
  }, []);

  const updateDialogUnreadCount = useCallback((dialogId: number, count: number) => {
    operatorUnreadDebug('WS: абсолютное значение непрочитанных по dialogId', {
      dialogId,
      count,
      perDialogРежим: useDetailedCountsRef.current,
    });
    setDialogsUnreadCounts((prev) => {
      const newMap = new Map(prev);
      if (useDetailedCountsRef.current || dialogId > 0) {
        newMap.set(dialogId, count);
        lastAbsoluteDialogUpdateAtRef.current.set(dialogId, Date.now());
      }
      chatUnreadTrace('socket.setDialogUnread (absolute)', {
        dialogId,
        count,
        useDetailed: useDetailedCountsRef.current,
        hasDetailedData: hasDetailedDataRef.current,
        mapAfter: unreadMapToRecord(newMap),
      });
      return newMap;
    });
  }, []);

  const reconcileDialogUnreadFromSessionFeed = useCallback(
    (
      dialogId: number,
      feedUnreadCount: number,
      hasAnyMessageForDialog: boolean,
      onApplied: (next: number, prevSocket: number) => void,
    ) => {
      setDialogsUnreadCounts((prev) => {
        const prevSocket = prev.get(dialogId) ?? 0;
        const next = hasAnyMessageForDialog
          ? feedUnreadCount
          : Math.max(feedUnreadCount, prevSocket);
        Promise.resolve().then(() => onApplied(next, prevSocket));
        if (prev.get(dialogId) === next) {
          return prev;
        }
        const newMap = new Map(prev);
        newMap.set(dialogId, next);
        operatorUnreadDebug('WS: согласование карты с пересчётом ленты (из prev Map)', {
          dialogId,
          feedUnreadCount,
          hasAnyMessageForDialog,
          prevSocket,
          next,
        });
        chatUnreadTrace('socket.reconcileDialogUnreadFromSessionFeed', {
          dialogId,
          feedUnreadCount,
          hasAnyMessageForDialog,
          prevSocket,
          next,
          mapAfter: unreadMapToRecord(newMap),
        });
        return newMap;
      });
    },
    [],
  );

  const incrementDialogUnreadCount = useCallback(
    (dialogId: number, amount = 1, dedupeKey?: string) => {
      if (dialogId > 0) {
        allowedUnreadDialogIdsRef.current.add(dialogId);
        unreadAllowlistReadyRef.current = true;
      }
      if (dedupeKey) {
        if (incrementDedupeByMessageRef.current.has(dedupeKey)) {
          chatUnreadTrace('socket.incrementDialogUnread (skip duplicate)', { dialogId, dedupeKey });
          return;
        }
        incrementDedupeByMessageRef.current.add(dedupeKey);
        setTimeout(() => incrementDedupeByMessageRef.current.delete(dedupeKey), 120_000);
      }
      // Кадры /queue/unread/{branch} задают абсолют; +1 здесь при том же сообщении даёт «1→2» (OPEN/ACTIVE).
      // Но для CLOSED per-dialog кадр может не прийти, поэтому разрешаем fallback +1.
      // Защита от double-count: если абсолютный per-dialog кадр по этому dialogId пришёл только что,
      // считаем его авторитетным и +1 пропускаем.
      useDetailedCountsRef.current = true;
      hasDetailedDataRef.current = true;
      setDialogsUnreadCounts((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(dialogId) || 0;
        const lastAbsoluteAt = lastAbsoluteDialogUpdateAtRef.current.get(dialogId) ?? 0;
        const absoluteIsFresh = Date.now() - lastAbsoluteAt < 2500;
        if (hasDetailedDataRef.current && absoluteIsFresh) {
          chatUnreadTrace(
            'socket.incrementDialogUnread (skip +1, recent absolute per-dialog authoritative)',
            {
              dialogId,
              dedupeKey,
              current,
              msSinceAbsolute: Date.now() - lastAbsoluteAt,
            },
          );
          return prev;
        }
        if (hasDetailedDataRef.current && current > 0 && !absoluteIsFresh) {
          chatUnreadTrace('socket.incrementDialogUnread (fallback +1 without fresh absolute)', {
            dialogId,
            dedupeKey,
            current,
            msSinceAbsolute: Date.now() - lastAbsoluteAt,
          });
        }
        const newCount = current + amount;
        newMap.set(dialogId, newCount);
        chatUnreadTrace('socket.incrementDialogUnread', {
          dialogId,
          amount,
          prev: current,
          next: newCount,
          mapAfter: unreadMapToRecord(newMap),
        });
        return newMap;
      });
    },
    [],
  );

  const mergeDialogUnreadFromApi = useCallback((dialogId: number, apiCount: number) => {
    if (dialogId > 0) {
      allowedUnreadDialogIdsRef.current.add(dialogId);
      unreadAllowlistReadyRef.current = true;
    }
    setDialogsUnreadCounts((prev) => {
      const prevCount = prev.get(dialogId) ?? 0;
      // REST-список «непрочитанных» часто отстаёт от WS; в detailed-режиме не затирать уже известный >0 нулём с API
      if (apiCount === 0 && prevCount > 0 && hasDetailedDataRef.current) {
        chatUnreadTrace('socket.mergeDialogUnreadFromApi (skip stale API zero, hasDetailedData)', {
          dialogId,
          apiCount,
          preserved: prevCount,
          aggregateUnread: unreadAggregateRef.current,
          mapAfter: unreadMapToRecord(prev),
        });
        return prev;
      }
      if (apiCount === 0 && prevCount > 0 && unreadAggregateRef.current > 0) {
        const cap = unreadAggregateRef.current;
        const positiveIds: number[] = [];
        prev.forEach((c, id) => {
          if (id > 0 && c > 0) positiveIds.push(id); 
        });
        const onlyThisDialog = positiveIds.length === 1 && positiveIds[0] === dialogId;
        const nextVal = onlyThisDialog ? Math.min(prevCount, cap) : prevCount;
        if (nextVal === prevCount) {
          chatUnreadTrace('socket.mergeDialogUnreadFromApi (skip stale API zero)', {
            dialogId,
            apiCount,
            preserved: prevCount,
            aggregateUnread: cap,
            mapAfter: unreadMapToRecord(prev),
          });
          return prev;
        }
        const cappedMap = new Map(prev);
        cappedMap.set(dialogId, nextVal);
        chatUnreadTrace('socket.mergeDialogUnreadFromApi (cap to aggregate, stale API zero)', {
          dialogId,
          prevCount,
          nextVal,
          aggregateUnread: cap,
          mapAfter: unreadMapToRecord(cappedMap),
        });
        return cappedMap;
      }
      const newMap = new Map(prev);
      if (useDetailedCountsRef.current || dialogId > 0) {
        newMap.set(dialogId, apiCount);
      }
      chatUnreadTrace('socket.mergeDialogUnreadFromApi (applied)', {
        dialogId,
        apiCount,
        prevCount,
        aggregateUnread: unreadAggregateRef.current,
        mapAfter: unreadMapToRecord(newMap),
      });
      return newMap;
    });
  }, []);

  const updateUnreadCountDirect = useCallback((count: number) => {
    operatorUnreadDebug('WS: общий агрегат непрочитанных (/user/queue/unread и т.п.)', {
      count,
      детальныеСчётчикиПоДиалогам: hasDetailedDataRef.current,
    });
    chatUnreadTrace('socket.setTotalUnread (branch/user aggregate)', {
      count,
      useDetailed: useDetailedCountsRef.current,
      hasDetailedData: hasDetailedDataRef.current,
    });
    unreadAggregateRef.current = count;
    setUnreadCount(count);
    setDialogsUnreadCounts((prev) => {
      // Когда есть детальные per-dialog данные (hasDetailedData=true), агрегат /user/queue/unread
      // представляет очередь конкретного пользователя, а не суммарный счётчик одного диалога.
      // Пример бага: диалог 83 (CLOSED) в карте с count=10; новое сообщение в диалоге 96
      // (CLOSED, не в карте) → агрегат=1 для очереди 96, но reconcile ошибочно применял бы
      // его к диалогу 83, обнуляя до 1. Когда hasDetailedData=true, per-dialog данные
      // авторитетны — не трогаем карту агрегатом.
      if (hasDetailedDataRef.current) return prev;
      const positive: { id: number; c: number }[] = [];
      prev.forEach((c, id) => {
        if (id > 0 && c > 0) positive.push({ id, c });
      });
      if (positive.length !== 1) return prev;
      const { id: onlyId, c: onlyC } = positive[0]!;
      // Агрегат 0 после STATUS_UPDATE может опережать снимок по филиалу; не обнулять карту
      // только по нему — нулевой per-dialog придёт с /queue/unread/{branch} или updateDialogUnread.
      if (count <= 0) return prev;
      if (onlyC <= count) return prev;
      const nextMap = new Map(prev);
      nextMap.set(onlyId, count);
      chatUnreadTrace('socket.reconcileSingleDialogMapToUserAggregate', {
        dialogId: onlyId,
        mapWas: onlyC,
        aggregate: count,
        mapAfter: unreadMapToRecord(nextMap),
      });
      return nextMap;
    });
  }, []);

  const sendStompFrame = (command: string, headers: any = {}, body: string = '') => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      if (command === 'SEND') {
        stompDebugLog('sendStompFrame skipped (cannot send)', {
          command,
          hasSocket: Boolean(socketRef.current),
          readyState: socketRef.current?.readyState,
          readyStateLabel: websocketReadyStateLabel(socketRef.current?.readyState),
        });
      }
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
      stompDebugLog('sendStompFrame WebSocket.send threw', {
        command,
        error: String(error),
      });
      return false;
    }
  };

  const disconnectWebSocket = (options?: { preserveUnreadCounts?: boolean }) => {
    stompDebugLog('disconnectWebSocket called', {
      hadSocket: Boolean(socketRef.current),
      hadStompClient: Boolean(stompClientRef.current),
      stompConnected: stompClientRef.current?.connected === true,
      preserveUnreadCounts: Boolean(options?.preserveUnreadCounts),
    });
    if (socketRef.current) {
      const socket = socketRef.current;
      if (socket.readyState === WebSocket.OPEN) {
        sendStompFrame('DISCONNECT');
        socket.close(1000, 'Смена филиала');
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      socketRef.current = null;
    }
    activeWsBaseUrlRef.current = null;

    if (stompClientRef.current) {
      stompClientRef.current.connected = false;
      stompClientRef.current = null;
    }
    setStompClient(null);

    setIsConnected(false);
    setConnectionStatus('disconnected');
    isConnectingRef.current = false;
    subscriptionsRef.current.clear();
    processedMessagesRef.current.clear();
    incomingChatMessagesQueueRef.current = [];
    incrementDedupeByMessageRef.current.clear();

    if (!options?.preserveUnreadCounts) {
      unreadAggregateRef.current = 0;
      setUnreadCount(0);
      resetDialogCounts();
    }
  };

  const scheduleReconnect = (branchId: string) => {
    if (!branchId || reconnectTimeoutRef.current || isConnectingRef.current) return;

    const delay = Math.min(30000, 2000 * Math.max(1, reconnectAttemptRef.current));
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = undefined;
      reconnectAttemptRef.current += 1;
      connectWebSocket(branchId);
    }, delay);
  };

  const publishStompMessage = useCallback(
    (destination: string, body: string, headers: Record<string, string> = {}) => {
      const client = stompClientRef.current;
      const socket = socketRef.current;
      if (!client?.connected || !socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      return client.publish({ destination, body, headers });
    },
    [],
  );

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

    subscriptionsRef.current.clear();
    topics.forEach((topic) => {
      const subscribeHeaders = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        destination: topic,
      };
      sendStompFrame('SUBSCRIBE', subscribeHeaders);
      subscriptionsRef.current.add(topic);
    });
    chatUnreadTrace('socket.subscribe.topics', {
      branchId: currentBranchId,
      topics,
      note: '/user/queue/unread — общий счётчик; /queue/unread/{branchId} — разбивка по dialogId',
    });
    stompDebugLog('STOMP subscribed to topics', {
      branchId: currentBranchId,
      count: topics.length,
    });
  };

  const connectWebSocket = (branchId: string) => {
    if (!apiConfig) {
      stompDebugLog('connectWebSocket bail', { hasApiConfig: false });
      return;
    }

    const branchIdNorm = String(branchId).trim();
    const { apiUrl, wsUrl: configWsUrl } = apiConfig;
    const wsUrl = resolveChatWebSocketUrl({ apiUrl, wsUrl: configWsUrl });

    const socket = socketRef.current;
    const sameBranch = currentBranchIdRef.current === branchIdNorm;
    const sameWsTarget = activeWsBaseUrlRef.current === wsUrl;
    const socketLive =
      socket &&
      (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN);

    if (stompClientRef.current?.connected && sameBranch && sameWsTarget) {
      return;
    }
    if (isConnectingRef.current && sameBranch && sameWsTarget && socketLive) {
      stompDebugLog('connectWebSocket skip — already connecting', { branchId: branchIdNorm });
      return;
    }

    const preserveUnreadCounts =
      currentBranchIdRef.current == null ||
      currentBranchIdRef.current === branchIdNorm ||
      (isElectronOperatorChatPopup() &&
        (hasDetailedDataRef.current || unreadAggregateRef.current > 0));

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    disconnectWebSocket({ preserveUnreadCounts });
    setConnectionStatus('connecting');
    setCurrentBranchId(branchIdNorm);
    currentBranchIdRef.current = branchIdNorm;
    activeWsBaseUrlRef.current = wsUrl;
    isConnectingRef.current = true;

    if (!wsUrl) {
      stompDebugLog('connectWebSocket no wsUrl after config', { apiUrl, configWsUrl });
      setConnectionStatus('error');
      isConnectingRef.current = false;
      return;
    }

    const token = getAuthToken();
    if (!token) {
      stompDebugLog('connectWebSocket no auth token', { branchId: branchIdNorm });
      setConnectionStatus('error');
      isConnectingRef.current = false;
      if (typeof window !== 'undefined' && window.alcolockDesktop) {
        window.setTimeout(() => {
          const retryBranchId = getBranchId();
          if (retryBranchId && getAuthToken() && apiConfig) {
            connectWebSocket(retryBranchId);
          }
        }, 2000);
      }
      return;
    }

    try {
      const finalWsUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;
      stompDebugLog('WebSocket connecting', {
        branchId: branchIdNorm,
        wsUrlMasked: stompDebugMaskWsUrl(finalWsUrl),
      });
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
      setStompClient(stompClient);

      socket.onopen = () => {
        stompDebugLog('WebSocket onopen, sending STOMP CONNECT', {
          branchId: branchIdNorm,
          urlMasked: stompDebugMaskWsUrl(finalWsUrl),
        });
        sendStompFrame('CONNECT', {
          'accept-version': '1.1,1.0',
          'heart-beat': '10000,10000',
        });
      };

      socket.onmessage = (event) => {
        try {
          const frame = parseStompFrame(event.data);

          if (frame.command === 'CONNECTED') {
            stompDebugLog('STOMP CONNECTED received', {
              branchId: branchIdNorm,
              headers: frame.headers,
            });
            setIsConnected(true);
            setConnectionStatus('connected');
            stompClient.connected = true;
            reconnectAttemptRef.current = 0;
            isConnectingRef.current = false;
            setStompClient((prev: any) => (prev ? { ...prev, connected: true } : prev));

            setTimeout(() => {
              subscribeToTopics(branchIdNorm);
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
              const destination = String(
                frame.headers.destination || frame.headers.Destination || '',
              ).trim();

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
                chatUnreadTrace('socket.frame /user/queue/unread (skip badge — очередь по всем филиалам)', {
                  countUnMessages: parsedBody?.countUnMessages,
                });
                // Не пишем в бейдж: countUnMessages здесь — сумма по оператору во всех филиалах.
                // Иконка и превью только из /queue/unread/{branchId}.
              } else if (destination === `/queue/unread/${branchIdNorm}`) {
                if (Array.isArray(parsedBody)) {
                  const hasRealDialogs = parsedBody.some(
                    (item: any) =>
                      item.dialogId && item.dialogId > 0 && item.countUnMessages !== undefined,
                  );

                  if (hasRealDialogs) {
                    useDetailedCountsRef.current = true;
                    hasDetailedDataRef.current = true;
                    const dialogCount = parsedBody.filter(
                      (d: any) => d.dialogId && typeof d.countUnMessages === 'number',
                    ).length;
                    chatUnreadTrace('socket.frame /queue/unread/{branch} array(per-dialog)', {
                      branchId: branchIdNorm,
                      dialogRows: dialogCount,
                      snapshot: parsedBody.map((d: any) => ({
                        dialogId: d.dialogId,
                        countUnMessages: d.countUnMessages,
                      })),
                    });
                    parsedBody.forEach((dialogData: any) => {
                      if (dialogData.dialogId && typeof dialogData.countUnMessages === 'number') {
                        updateDialogUnreadCount(dialogData.dialogId, dialogData.countUnMessages);
                      }
                    });
                  } else {
                    const firstItem = parsedBody[0];
                    chatUnreadTrace('socket.frame /queue/unread/{branch} array(fallback total)', {
                      branchId: branchIdNorm,
                      length: parsedBody.length,
                      firstCountUnMessages: firstItem?.countUnMessages,
                    });
                    if (firstItem && typeof firstItem.countUnMessages === 'number') {
                      useDetailedCountsRef.current = false;
                      hasDetailedDataRef.current = false;
                      updateUnreadCountDirect(firstItem.countUnMessages);
                    }
                  }
                } else if (parsedBody?.dialogId && typeof parsedBody.countUnMessages === 'number') {
                  if (parsedBody.dialogId > 0) {
                    chatUnreadTrace('socket.frame /queue/unread/{branch} single dialog object', {
                      branchId: branchIdNorm,
                      dialogId: parsedBody.dialogId,
                      countUnMessages: parsedBody.countUnMessages,
                    });
                    useDetailedCountsRef.current = true;
                    hasDetailedDataRef.current = true;
                    updateDialogUnreadCount(parsedBody.dialogId, parsedBody.countUnMessages);
                  }
                } else if (
                  parsedBody &&
                  typeof parsedBody.countUnMessages === 'number' &&
                  !parsedBody.dialogId
                ) {
                  chatUnreadTrace('socket.frame /queue/unread/{branch} aggregate object', {
                    branchId: branchIdNorm,
                    countUnMessages: parsedBody.countUnMessages,
                    skippedBecausePerDialogMode: Boolean(
                      useDetailedCountsRef.current && hasDetailedDataRef.current,
                    ),
                  });
                  if (!(useDetailedCountsRef.current && hasDetailedDataRef.current)) {
                    useDetailedCountsRef.current = false;
                    hasDetailedDataRef.current = false;
                    updateUnreadCountDirect(parsedBody.countUnMessages);
                  }
                }

                chatUnreadTrace('socket.lastMessage emit', {
                  type: 'DIALOGS_UPDATE',
                  destination,
                  note: 'ChatContext обрабатывает DIALOGS_UPDATE как no-op для счётчиков (см. лог context)',
                });
                setLastMessage({
                  data: parsedBody,
                  type: 'DIALOGS_UPDATE',
                  rawBody: cleanedBody,
                  destination: destination,
                  forceRefresh: true,
                });
              } else if (destination === '/user/queue/messages') {
                if (!isPayloadForCurrentOperatorBranch(parsedBody)) {
                  return;
                }
                if (parsedBody?.dialog?.id && parsedBody.messageStatus === 'TO_OPERATOR') {
                  useDetailedCountsRef.current = true;
                  hasDetailedDataRef.current = true;
                }

                incomingChatMessagesQueueRef.current.push(parsedBody);
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
              } else if (destination === `/topic/dialog/status/${branchIdNorm}`) {
                setLastMessage({
                  data: parsedBody,
                  type: 'DIALOG_STATUS_UPDATE',
                  rawBody: cleanedBody,
                  destination: destination,
                });
              } else if (destination === `/topic/operator/messages/${branchIdNorm}`) {
                if (!isPayloadForCurrentOperatorBranch(parsedBody)) {
                  return;
                }
                incomingChatMessagesQueueRef.current.push(parsedBody);
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
            stompDebugLog('STOMP ERROR frame', {
              branchId: branchIdNorm,
              headers: frame.headers,
              bodyPreview:
                typeof frame.body === 'string' ? frame.body.slice(0, 500) : String(frame.body),
            });
            setLastMessage({ type: 'error', data: frame });
            setConnectionStatus('error');
            isConnectingRef.current = false;
          }
        } catch (error) {
          console.error('Ошибка парсинга сообщения WebSocket:', error);
        }
      };

      socket.onerror = (error) => {
        stompDebugLog('WebSocket onerror', {
          branchId: branchIdNorm,
          wsUrlMasked: stompDebugMaskWsUrl(finalWsUrl),
          event: error && typeof error === 'object' ? String(error.type) : String(error),
        });
        setIsConnected(false);
        setConnectionStatus('error');
        if (stompClientRef.current) {
          stompClientRef.current.connected = false;
        }
        setStompClient((prev: any) => (prev ? { ...prev, connected: false } : null));
        isConnectingRef.current = false;
      };

      socket.onclose = (event) => {
        stompDebugLog('WebSocket onclose', {
          branchId: branchIdNorm,
          code: event.code,
          reason: event.reason || '',
          wasClean: event.wasClean,
          wsUrlMasked: stompDebugMaskWsUrl(finalWsUrl),
        });
        setIsConnected(false);
        setConnectionStatus('disconnected');
        if (stompClientRef.current) {
          stompClientRef.current.connected = false;
        }
        setStompClient((prev: any) => (prev ? { ...prev, connected: false } : null));
        isConnectingRef.current = false;
        subscriptionsRef.current.clear();
        processedMessagesRef.current.clear();
        incomingChatMessagesQueueRef.current = [];
        incrementDedupeByMessageRef.current.clear();

        if (event.code !== 1000 && event.reason !== 'Смена филиала') {
          scheduleReconnect(branchIdNorm);
        }
      };
    } catch (error) {
      console.error('Ошибка создания WebSocket:', error);
      stompDebugLog('connectWebSocket constructor threw', {
        branchId: branchIdNorm,
        error: String(error),
      });
      setConnectionStatus('error');
      isConnectingRef.current = false;
    }
  };

  useEffect(() => {
    if (!stompConnect) return undefined;

    const unsubscribe = appStore.subscribe(() => {
      const newBranchId = getBranchId();
      if (!newBranchId || !apiConfig) return;

      const branchChanged = newBranchId !== currentBranchIdRef.current;
      const electronPopupNeedsConnect =
        isElectronOperatorChatPopup() &&
        Boolean(getAuthToken()) &&
        !stompClientRef.current?.connected &&
        !isConnectingRef.current;

      if (branchChanged || electronPopupNeedsConnect) {
        connectWebSocket(newBranchId);
      }
    });

    const initializeWithRetry = (attempt = 0) => {
      const maxAttempts = typeof window !== 'undefined' && window.alcolockDesktop ? 24 : 5;
      if (attempt > maxAttempts) return;
      const initialBranchId = getBranchId();
      if (initialBranchId && apiConfig) {
        if (!isConnectingRef.current && !stompClientRef.current?.connected) {
          connectWebSocket(initialBranchId);
        }
      } else if (!apiConfig) {
        setTimeout(() => initializeWithRetry(attempt), 500);
      } else {
        setTimeout(() => initializeWithRetry(attempt + 1), 500);
      }
    };

    const initTimeout = setTimeout(() => {
      if (!apiConfig) return;
      if (isElectronOperatorChatPopup() && !getAuthToken()) {
        stompDebugLog('electron popup: defer STOMP init until auth token');
        return;
      }
      initializeWithRetry();
    }, isElectronOperatorChatPopup() ? 400 : 1000);

    return () => {
      clearTimeout(initTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      unsubscribe();
      disconnectWebSocket({ preserveUnreadCounts: true });
    };
  }, [apiConfig, stompConnect]);

  /** Electron (основное окно и popup): STOMP после JWT/филиала. */
  useEffect(() => {
    if (!stompConnect || !isElectronChatShell()) return undefined;

    if (getAuthToken()) {
      notifyDesktopAuthReady();
    }

    const tryConnectWhenReady = () => {
      if (!apiConfig) return;
      if (isConnectingRef.current) return;
      if (stompClientRef.current?.connected) return;
      const branchId = getBranchId();
      const token = getAuthToken();
      if (!branchId || !token) {
        if (isElectronOperatorChatPopup()) {
          stompDebugLog('electron popup: STOMP wait', {
            hasBranchId: Boolean(branchId),
            hasToken: Boolean(token),
          });
        }
        return;
      }
      stompDebugLog('electron STOMP tryConnect', {
        isPopup: isElectronOperatorChatPopup(),
        branchId,
        wsUrl: resolveChatWebSocketUrl(apiConfig),
      });
      connectWebSocket(branchId);
    };

    window.addEventListener(DESKTOP_AUTH_READY_EVENT, tryConnectWhenReady);
    window.addEventListener(DESKTOP_BRANCH_READY_EVENT, tryConnectWhenReady);
    tryConnectWhenReady();

    let pollId: number | undefined;
    let pollAttempts = 0;
    if (isElectronOperatorChatPopup()) {
      pollId = window.setInterval(() => {
        pollAttempts += 1;
        if (stompClientRef.current?.connected || pollAttempts > 120) {
          if (pollId !== undefined) {
            window.clearInterval(pollId);
            pollId = undefined;
          }
          return;
        }
        tryConnectWhenReady();
      }, 500);
    }

    return () => {
      window.removeEventListener(DESKTOP_AUTH_READY_EVENT, tryConnectWhenReady);
      window.removeEventListener(DESKTOP_BRANCH_READY_EVENT, tryConnectWhenReady);
      if (pollId !== undefined) {
        window.clearInterval(pollId);
      }
    };
  }, [apiConfig, stompConnect]);

  return (
    <SocketContext.Provider
      value={{
        lastMessage,
        stompClient,
        isConnected,
        connectionStatus,
        currentBranchId,
        unreadCount,
        dialogsUnreadCounts,
        setUnreadCount: updateUnreadCountDirect,
        updateDialogUnreadCount,
        reconcileDialogUnreadFromSessionFeed,
        mergeDialogUnreadFromApi,
        incrementDialogUnreadCount,
        restrictUnreadCountsToDialogIds,
        calculateTotalUnread,
        resetDialogCounts,
        publishStompMessage,
        flushIncomingChatMessages,
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
