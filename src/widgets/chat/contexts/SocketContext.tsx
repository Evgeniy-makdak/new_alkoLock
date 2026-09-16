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

import { configLoader } from '../../../config/configLoader';
import { isElectronChatShell } from '../chatPopup/chatShellEnvironment';
import {
  DESKTOP_AUTH_READY_EVENT,
  isElectronOperatorChatPopup,
  notifyDesktopAuthReady,
} from '../chatPopup/electronPopupAuth';
import { DESKTOP_BRANCH_READY_EVENT } from '../chatPopup/electronPopupSessionBootstrap';
import { resolveChatWebSocketUrl } from '../chatPopup/electronWebSocketUrl';
import { peekDesktopSocketUnreadHandoff } from '../chatPopup/mainChatOpenRestoreFromPopup';
import { isPayloadForCurrentOperatorBranch } from '../lib/chatBranchGuard';
import { isClosedDialogVisibleToCurrentOperator } from '../lib/chatOperatorPermissions';
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
  /** true — агрегат /queue/unread/{branch} уже приходил по WS (бейдж иконки живой). */
  unreadAggregateIsLive: boolean;
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
  /**
   * Убрать диалог из суммы основного бейджа (чужой CLOSED / transfer):
   * удаляет id из allowlist, но сохраняет значение в WS-карте (park),
   * чтобы при возврате в ACTIVE бейдж восстановился без ожидания новых сообщений.
   */
  excludeDialogFromUnreadTotal: (dialogId: number) => void;
  /**
   * Вернуть диалог в сумму основного бейджа (CLOSED → ACTIVE/OPEN):
   * добавляет id в allowlist (+ pin против гонки со stale REST).
   * Значение берётся из сохранённой WS-карты.
   */
  includeDialogInUnreadTotal: (dialogId: number) => void;
  /**
   * Принудительно запросить свежий снимок счётчиков из WS-подписок
   * (/queue/unread/{branch} и /user/queue/unread) — re-SUBSCRIBE.
   * Нужен после DIALOG_STATUS, когда бэкенд не шлёт кадр сам (нет нового сообщения).
   */
  requestUnreadTopicsRefresh: () => void;
  /** Есть ли диалоги, убранные из бейджа из‑за чужого CLOSED (ждут таймаут/разблокировку). */
  hasParkedForeignClosedDialogs: () => boolean;
  /** Id «припаркованных» чужих CLOSED (для poll статуса при закрытом окне чата). */
  getParkedForeignClosedDialogIds: () => number[];
  /** Подписка на изменение набора «припаркованных» чужих CLOSED. */
  subscribeParkedForeignClosedDialogs: (listener: () => void) => () => void;
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
  const [unreadAggregateIsLive, setUnreadAggregateIsLive] = useState<boolean>(false);
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
  /**
   * Id, явно возвращённые в сумму бейджа по DIALOG_STATUS (CLOSED→ACTIVE).
   * Нужны, пока stale REST-снимок ещё не содержит диалог: иначе restrict
   * затрёт allowlist и бейдж снова станет 0 без новых WS-кадров.
   */
  const pinnedUnreadDialogIdsRef = useRef<Set<number>>(new Set());
  /**
   * Недавние решения по allowlist из /topic/dialog/status.
   * Бэкенд-список непрочитанных отстаёт на несколько секунд — без этого
   * stale REST через restrict возвращает чужой CLOSED в сумму бейджа.
   */
  const dialogStatusUnreadOverrideRef = useRef<
    Map<number, { mode: 'include' | 'exclude'; at: number }>
  >(new Map());
  /**
   * Диалоги, убранные из бейджа из‑за чужого CLOSED. Живут до include / появления
   * снова в REST-списке. Нужны для таймаута разблокировки: бэкенд часто не шлёт
   * Op2 тот же DIALOG_STATUS, что при ручном «Завершить».
   */
  const parkedForeignClosedDialogIdsRef = useRef<Set<number>>(new Set());
  /**
   * После снятия park (CLOSED→ACTIVE): несколько секунд не даём stale REST/ленте/absolute
   * переписать live-count, накопленный за время чужого CLOSED (+1 и READ).
   * incrementDialogUnreadCount (новые сообщения после «Завершить») не блокируется.
   */
  const parkReleaseGuardUntilRef = useRef<Map<number, number>>(new Map());
  const parkedForeignClosedListenersRef = useRef<Set<() => void>>(new Set());
  const unreadAllowlistReadyRef = useRef(false);
  const requestUnreadTopicsRefreshRef = useRef<() => void>(() => {});
  const unreadTopicsRefreshTimerRef = useRef<number | undefined>(undefined);

  const notifyParkedForeignClosedDialogsChanged = useCallback(() => {
    parkedForeignClosedListenersRef.current.forEach((listener) => {
      try {
        listener();
      } catch {
        // ignore listener errors
      }
    });
  }, []);

  const hasParkedForeignClosedDialogs = useCallback(
    () => parkedForeignClosedDialogIdsRef.current.size > 0,
    [],
  );

  const getParkedForeignClosedDialogIds = useCallback(
    () => Array.from(parkedForeignClosedDialogIdsRef.current),
    [],
  );

  const subscribeParkedForeignClosedDialogs = useCallback((listener: () => void) => {
    parkedForeignClosedListenersRef.current.add(listener);
    return () => {
      parkedForeignClosedListenersRef.current.delete(listener);
    };
  }, []);

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
    pinnedUnreadDialogIdsRef.current = new Set();
    dialogStatusUnreadOverrideRef.current = new Map();
    parkedForeignClosedDialogIdsRef.current = new Set();
    parkReleaseGuardUntilRef.current = new Map();
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
    const fromRest = dialogIds.filter((id) => typeof id === 'number' && id > 0);
    let parkedReleased = false;
    // REST уже подтвердил диалог — pin больше не нужен; чужой CLOSED после таймаута
    // снова в списке → снимаем park/exclude-override.
    fromRest.forEach((id) => {
      pinnedUnreadDialogIdsRef.current.delete(id);
      if (parkedForeignClosedDialogIdsRef.current.delete(id)) {
        parkedReleased = true;
      }
      // park-release guard (в include) не даёт stale REST переписать live-count.
      const ov = dialogStatusUnreadOverrideRef.current.get(id);
      if (ov?.mode === 'exclude') {
        dialogStatusUnreadOverrideRef.current.delete(id);
      }
    });
    if (parkedReleased) {
      notifyParkedForeignClosedDialogsChanged();
    }
    const nextAllowed = new Set<number>([
      ...fromRest,
      ...pinnedUnreadDialogIdsRef.current,
    ]);
    // WS-статус авторитетнее REST несколько секунд (лаг списка непрочитанных).
    const now = Date.now();
    const OVERRIDE_TTL_MS = 15_000;
    dialogStatusUnreadOverrideRef.current.forEach((entry, id) => {
      if (now - entry.at > OVERRIDE_TTL_MS) {
        dialogStatusUnreadOverrideRef.current.delete(id);
        return;
      }
      if (entry.mode === 'exclude') {
        nextAllowed.delete(id);
        pinnedUnreadDialogIdsRef.current.delete(id);
      } else {
        nextAllowed.add(id);
        pinnedUnreadDialogIdsRef.current.add(id);
      }
    });
    const prevAllowed = allowedUnreadDialogIdsRef.current;
    let allowlistChanged = prevAllowed.size !== nextAllowed.size;
    if (!allowlistChanged) {
      for (const id of nextAllowed) {
        if (!prevAllowed.has(id)) {
          allowlistChanged = true;
          break;
        }
      }
    }
    allowedUnreadDialogIdsRef.current = nextAllowed;
    // Карту НЕ фильтруем. Значения диалогов, временно исчезнувших из REST-списка
    // (например, диалог забрал другой оператор), сохраняются: когда диалог вернётся
    // в очередь (CLOSED→ACTIVE), includeDialogInUnreadTotal / pin вернут id в сумму
    // без ожидания новых сообщений и без обнуления карты. Лишние записи безвредны:
    // сумма для иконки считается только по allowlist (calculateTotalUnread), превью
    // рендерится только по REST-списку диалогов.
    //
    // Важно: allowlist хранится в ref. Без setState бейдж на закрытой иконке чата
    // не перерисуется после DIALOG_STATUS / REST-ресинка (карта могла не измениться).
    if (allowlistChanged) {
      chatUnreadTrace('socket.restrictUnreadCountsToDialogIds (allowlist changed → rerender)', {
        fromRestCount: fromRest.length,
        pinnedCount: pinnedUnreadDialogIdsRef.current.size,
        allowedCount: nextAllowed.size,
        parkedReleased,
      });
      setDialogsUnreadCounts((prev) => new Map(prev));
    }
  }, [notifyParkedForeignClosedDialogsChanged]);

  const excludeDialogFromUnreadTotal = useCallback((dialogId: number) => {
    if (!(dialogId > 0)) return;
    pinnedUnreadDialogIdsRef.current.delete(dialogId);
    dialogStatusUnreadOverrideRef.current.set(dialogId, { mode: 'exclude', at: Date.now() });
    const wasParked = parkedForeignClosedDialogIdsRef.current.has(dialogId);
    parkedForeignClosedDialogIdsRef.current.add(dialogId);
    if (!wasParked) {
      notifyParkedForeignClosedDialogsChanged();
    }
    const wasAllowed = allowedUnreadDialogIdsRef.current.delete(dialogId);
    // Важно: карту НЕ обнуляем. Иначе при CLOSED→ACTIVE (без новых сообщений и без
    // кадра /queue/unread/{branch}) восстанавливать будет нечего — бейдж останется 0.
    // calculateTotalUnread и так игнорирует id вне allowlist.
    if (!wasAllowed) {
      chatUnreadTrace('socket.excludeDialogFromUnreadTotal (noop)', { dialogId });
      setDialogsUnreadCounts((prev) => new Map(prev));
      return;
    }
    setDialogsUnreadCounts((prev) => {
      chatUnreadTrace('socket.excludeDialogFromUnreadTotal (allowlist park)', {
        dialogId,
        preservedCount: prev.get(dialogId) ?? 0,
        mapAfter: unreadMapToRecord(prev),
      });
      return new Map(prev);
    });
  }, [notifyParkedForeignClosedDialogsChanged]);

  /**
   * Диалог снова виден оператору (CLOSED→ACTIVE): pin + allowlist.
   * Значение — из live WS-карты (за park она уже обновлялась +1/READ).
   * Несколько секунд guard: stale REST/лента после «Завершить» не откатывают count.
   */
  const includeDialogInUnreadTotal = useCallback((dialogId: number) => {
    if (!(dialogId > 0)) return;
    pinnedUnreadDialogIdsRef.current.add(dialogId);
    dialogStatusUnreadOverrideRef.current.set(dialogId, { mode: 'include', at: Date.now() });
    const wasParked = parkedForeignClosedDialogIdsRef.current.delete(dialogId);
    if (wasParked) {
      notifyParkedForeignClosedDialogsChanged();
      parkReleaseGuardUntilRef.current.set(dialogId, Date.now() + 8_000);
      requestUnreadTopicsRefreshRef.current();
    }
    unreadAllowlistReadyRef.current = true;
    const already = allowedUnreadDialogIdsRef.current.has(dialogId);
    allowedUnreadDialogIdsRef.current.add(dialogId);
    setDialogsUnreadCounts((prev) => {
      chatUnreadTrace(
        already
          ? 'socket.includeDialogInUnreadTotal (pin/refresh)'
          : 'socket.includeDialogInUnreadTotal',
        {
          dialogId,
          restoredCount: prev.get(dialogId) ?? 0,
          wasParked,
          mapAfter: unreadMapToRecord(prev),
        },
      );
      return new Map(prev);
    });
  }, [notifyParkedForeignClosedDialogsChanged]);

  const excludeDialogFromUnreadTotalRef = useRef(excludeDialogFromUnreadTotal);
  const includeDialogInUnreadTotalRef = useRef(includeDialogInUnreadTotal);
  excludeDialogFromUnreadTotalRef.current = excludeDialogFromUnreadTotal;
  includeDialogInUnreadTotalRef.current = includeDialogInUnreadTotal;

  const isParkReleaseGuarded = (dialogId: number): boolean => {
    const until = parkReleaseGuardUntilRef.current.get(dialogId);
    if (until == null) return false;
    if (Date.now() >= until) {
      parkReleaseGuardUntilRef.current.delete(dialogId);
      return false;
    }
    return true;
  };

  /**
   * Синхронно по кадру /topic/dialog/status: не ждём React lastMessage
   * (при частых «забрать»/«завершить» промежуточные кадры иначе теряются).
   */
  const applyUnreadAllowlistForDialogStatusFrame = useCallback((parsedBody: any) => {
    const dialogId = Number(
      parsedBody?.dialogId ??
        parsedBody?.dialog_id ??
        parsedBody?.dialog?.id ??
        parsedBody?.id,
    );
    const reason = String(
      parsedBody?.reason ?? parsedBody?.event ?? parsedBody?.eventType ?? parsedBody?.type ?? '',
    ).toUpperCase();
    const lockedFlag = parsedBody?.locked ?? parsedBody?.isLocked ?? parsedBody?.dialog?.locked;
    const dialogStatusRaw =
      parsedBody?.dialogStatus ??
      parsedBody?.dialog_status ??
      parsedBody?.newStatus ??
      parsedBody?.new_status ??
      parsedBody?.toStatus ??
      parsedBody?.status ??
      parsedBody?.dialog?.status;
    let statusUpper = dialogStatusRaw != null ? String(dialogStatusRaw).toUpperCase() : '';

    // Таймаут/разблокировка: бэкенд иногда шлёт флаг без явного ACTIVE/OPEN.
    if (
      !statusUpper &&
      (reason.includes('TIMEOUT') ||
        reason.includes('UNLOCK') ||
        reason.includes('EXPIRE') ||
        lockedFlag === false)
    ) {
      statusUpper = 'ACTIVE';
    }
    if (!(dialogId > 0) || !statusUpper) return;

    const incomingLastOperator =
      parsedBody?.lastOperator ??
      parsedBody?.last_operator ??
      parsedBody?.dialog?.lastOperator ??
      parsedBody?.dialog?.last_operator;

    if (statusUpper !== 'CLOSED' || lockedFlag === false) {
      includeDialogInUnreadTotalRef.current(dialogId);
      return;
    }
    if (
      !isClosedDialogVisibleToCurrentOperator({
        status: statusUpper,
        lastOperator: incomingLastOperator,
        last_operator: incomingLastOperator,
      })
    ) {
      excludeDialogFromUnreadTotalRef.current(dialogId);
    }
  }, []);
  const applyUnreadAllowlistForDialogStatusFrameRef = useRef(
    applyUnreadAllowlistForDialogStatusFrame,
  );
  applyUnreadAllowlistForDialogStatusFrameRef.current = applyUnreadAllowlistForDialogStatusFrame;

  /**
   * Сразу после снятия park: не переписывать live-count stale REST/лентой/absolute.
   * Новые сообщения после «Завершить» идут через incrementDialogUnreadCount — без guard.
   */
  const shouldFreezeCountAfterParkRelease = (dialogId: number, prevCount: number, incomingCount: number) =>
    incomingCount !== prevCount && isParkReleaseGuarded(dialogId);

  const updateDialogUnreadCount = useCallback((dialogId: number, count: number) => {
    const override = dialogStatusUnreadOverrideRef.current.get(dialogId);
    const excludeActive =
      override?.mode === 'exclude' && Date.now() - override.at < 15_000;
    const isParked = parkedForeignClosedDialogIdsRef.current.has(dialogId);
    if (dialogId > 0 && !excludeActive && !isParked) {
      allowedUnreadDialogIdsRef.current.add(dialogId);
      unreadAllowlistReadyRef.current = true;
    }
    setDialogsUnreadCounts((prev) => {
      const prevCount = prev.get(dialogId) ?? 0;
      if (shouldFreezeCountAfterParkRelease(dialogId, prevCount, count)) {
        chatUnreadTrace('socket.setDialogUnread (park-release guard)', {
          dialogId,
          count,
          prevCount,
        });
        return prev;
      }
      const newMap = new Map(prev);
      if (useDetailedCountsRef.current || dialogId > 0) {
        newMap.set(dialogId, count);
        lastAbsoluteDialogUpdateAtRef.current.set(dialogId, Date.now());
      }
      chatUnreadTrace('socket.setDialogUnread (absolute)', {
        dialogId,
        count,
        excludeActive,
        isParked,
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
        let next = hasAnyMessageForDialog
          ? feedUnreadCount
          : Math.max(feedUnreadCount, prevSocket);
        if (shouldFreezeCountAfterParkRelease(dialogId, prevSocket, next)) {
          next = prevSocket;
          chatUnreadTrace('socket.reconcileDialogUnreadFromSessionFeed (park-release guard)', {
            dialogId,
            feedUnreadCount,
            prevSocket,
          });
        }
        Promise.resolve().then(() => onApplied(next, prevSocket));
        if (prev.get(dialogId) === next) {
          return prev;
        }
        const newMap = new Map(prev);
        newMap.set(dialogId, next);
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

  /**
   * Запись per-dialog значения из кадра филиала /queue/unread/{branch}.
   */
  const applyDialogUnreadFromBranchFrame = useCallback((dialogId: number, count: number) => {
    if (!(dialogId > 0) || !Number.isFinite(count)) return;
    if (count === 0) return;
    useDetailedCountsRef.current = true;
    hasDetailedDataRef.current = true;
    setDialogsUnreadCounts((prev) => {
      const prevCount = prev.get(dialogId) ?? 0;
      if (prevCount === count) return prev;
      if (shouldFreezeCountAfterParkRelease(dialogId, prevCount, count)) {
        chatUnreadTrace('socket.applyDialogUnreadFromBranchFrame (park-release guard)', {
          dialogId,
          count,
          prevCount,
        });
        return prev;
      }
      lastAbsoluteDialogUpdateAtRef.current.set(dialogId, Date.now());
      const newMap = new Map(prev);
      newMap.set(dialogId, count);
      chatUnreadTrace('socket.applyDialogUnreadFromBranchFrame', {
        dialogId,
        count,
        prev: prevCount,
        mapAfter: unreadMapToRecord(newMap),
      });
      return newMap;
    });
  }, []);

  const incrementDialogUnreadCount = useCallback(
    (dialogId: number, amount = 1, dedupeKey?: string) => {
      const override = dialogStatusUnreadOverrideRef.current.get(dialogId);
      const excludeActive =
        override?.mode === 'exclude' && Date.now() - override.at < 15_000;
      const isParked = parkedForeignClosedDialogIdsRef.current.has(dialogId);
      // Чужой CLOSED: allowlist не трогаем, но карту обновляем — иначе после «Завершить»
      // include вернёт устаревший park (7 вместо 8).
      if (dialogId > 0 && !excludeActive && !isParked) {
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
        // Пока id в park/exclude — absolute-кадр часто «заморожен» на старом count;
        // +1 по живому сообщению всё равно нужен, иначе после «Завершить» будет 7 вместо 8.
        if (hasDetailedDataRef.current && absoluteIsFresh && !excludeActive && !isParked) {
          chatUnreadTrace(
            'socket.incrementDialogUnread (skip +1, recent absolute per-dialog authoritative)',
            {
              dialogId,
              dedupeKey,
              current,
              excludeActive,
              isParked,
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
            excludeActive,
            isParked,
            msSinceAbsolute: Date.now() - lastAbsoluteAt,
          });
        }
        const newCount = current + amount;
        newMap.set(dialogId, newCount);
        chatUnreadTrace(
          excludeActive || isParked
            ? 'socket.incrementDialogUnread (parked map only)'
            : 'socket.incrementDialogUnread',
          {
            dialogId,
            amount,
            prev: current,
            next: newCount,
            excludeActive,
            isParked,
            mapAfter: unreadMapToRecord(newMap),
          },
        );
        return newMap;
      });
    },
    [],
  );

  const mergeDialogUnreadFromApi = useCallback((dialogId: number, apiCount: number) => {
    const override = dialogStatusUnreadOverrideRef.current.get(dialogId);
    const excludeActive =
      override?.mode === 'exclude' && Date.now() - override.at < 15_000;
    const isParked = parkedForeignClosedDialogIdsRef.current.has(dialogId);
    if (excludeActive || isParked) {
      chatUnreadTrace('socket.mergeDialogUnreadFromApi (skip allowlist, parked/exclude)', {
        dialogId,
        apiCount,
        excludeActive,
        isParked,
      });
      setDialogsUnreadCounts((prev) => {
        const prevCount = prev.get(dialogId) ?? 0;
        if (prevCount >= apiCount) return prev;
        const newMap = new Map(prev);
        newMap.set(dialogId, apiCount);
        return newMap;
      });
      return;
    }
    if (dialogId > 0) {
      allowedUnreadDialogIdsRef.current.add(dialogId);
      unreadAllowlistReadyRef.current = true;
    }
    setDialogsUnreadCounts((prev) => {
      const prevCount = prev.get(dialogId) ?? 0;
      if (shouldFreezeCountAfterParkRelease(dialogId, prevCount, apiCount)) {
        chatUnreadTrace('socket.mergeDialogUnreadFromApi (park-release guard)', {
          dialogId,
          apiCount,
          prevCount,
        });
        return prev;
      }
      // Не затираем живой WS меньшим/нулевым REST.
      if (prevCount >= apiCount) {
        chatUnreadTrace('socket.mergeDialogUnreadFromApi (skip, WS value >= api)', {
          dialogId,
          apiCount,
          preserved: prevCount,
          mapAfter: unreadMapToRecord(prev),
        });
        return prev;
      }
      const newMap = new Map(prev);
      newMap.set(dialogId, apiCount);
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
    chatUnreadTrace('socket.setTotalUnread (branch/user aggregate)', {
      count,
      useDetailed: useDetailedCountsRef.current,
      hasDetailedData: hasDetailedDataRef.current,
    });
    // Первый агрегатный кадр по WS: бейдж иконки считается «живым».
    setUnreadAggregateIsLive(true);
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

    // Счётчики (unreadCount / dialogsUnreadCounts) намеренно НЕ сбрасываем ни при переподключении,
    // ни при смене филиала: ждём первый кадр новой подписки (/queue/unread/{branch} и
    // /user/queue/unread) — иначе бейджи мигают нулём между disconnect и первым MESSAGE.
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

  /** WebSocket часто склеивает несколько STOMP-кадров в один event.data. */
  const splitStompFrames = (data: string): string[] => {
    if (!data) return [];
    if (!data.includes('\x00')) return [data];
    return data
      .split('\x00')
      .map((chunk) => chunk.replace(/^\n+/, '').trimEnd())
      .filter((chunk) => chunk.length > 0);
  };

  const unreadSubscribeIdsRef = useRef<Map<string, string>>(new Map());

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
    unreadSubscribeIdsRef.current.clear();
    topics.forEach((topic) => {
      const subId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const subscribeHeaders = {
        id: subId,
        destination: topic,
      };
      sendStompFrame('SUBSCRIBE', subscribeHeaders);
      subscriptionsRef.current.add(topic);
      if (topic === `/queue/unread/${currentBranchId}` || topic === '/user/queue/unread') {
        unreadSubscribeIdsRef.current.set(topic, subId);
      }
    });
    chatUnreadTrace('socket.subscribe.topics', {
      branchId: currentBranchId,
      topics,
      note: '/user/queue/unread — детально по диалогам; /queue/unread/{branchId} — общий агрегат',
    });
    // Временное диагностическое логирование потока непрочитанных (localStorage.CHAT_UNREAD_DEBUG='1').
    operatorUnreadDebug('WS: подписки оформлены (SUBSCRIBE отправлен)', {
      branchId: currentBranchId,
      topics,
      ключевые: {
        агрегатИконки: `/queue/unread/${currentBranchId}`,
        детальноПоДиалогам: '/user/queue/unread',
        входящиеPersonal: '/user/queue/messages',
        входящиеФилиала: `/topic/operator/messages/${currentBranchId}`,
      },
    });
    stompDebugLog('STOMP subscribed to topics', {
      branchId: currentBranchId,
      count: topics.length,
    });
  };

  const requestUnreadTopicsRefresh = useCallback(() => {
    const branchId = currentBranchIdRef.current;
    if (!branchId) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    // Trailing debounce: серия «забрать»/«завершить» → один refresh подписок.
    if (unreadTopicsRefreshTimerRef.current !== undefined) {
      window.clearTimeout(unreadTopicsRefreshTimerRef.current);
    }
    unreadTopicsRefreshTimerRef.current = window.setTimeout(() => {
      unreadTopicsRefreshTimerRef.current = undefined;
      const liveBranchId = currentBranchIdRef.current;
      if (!liveBranchId) return;
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

      const topics = [`/queue/unread/${liveBranchId}`, '/user/queue/unread'];
      topics.forEach((topic) => {
        const prevId = unreadSubscribeIdsRef.current.get(topic);
        if (prevId) {
          sendStompFrame('UNSUBSCRIBE', { id: prevId });
        }
        const subId = `sub-unread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sendStompFrame('SUBSCRIBE', { id: subId, destination: topic });
        unreadSubscribeIdsRef.current.set(topic, subId);
        subscriptionsRef.current.add(topic);
      });
      chatUnreadTrace('socket.requestUnreadTopicsRefresh', { branchId: liveBranchId, topics });
      operatorUnreadDebug('WS: принудительный refresh подписок unread после DIALOG_STATUS', {
        branchId: liveBranchId,
        topics,
      });
    }, 80);
  }, []);
  requestUnreadTopicsRefreshRef.current = requestUnreadTopicsRefresh;

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
          const chunks = splitStompFrames(String(event.data ?? ''));
          for (const chunk of chunks) {
          const frame = parseStompFrame(chunk);

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
            if (!cleanedBody) continue;

            const destination = String(
              frame.headers.destination || frame.headers.Destination || '',
            ).trim();
            const isDialogStatusDest = destination.includes('/topic/dialog/status/');
            // Статусы диалога НЕ дедуплицируем: CLOSED→ACTIVE→CLOSED с тем же телом
            // иначе второй CLOSED в окне 10с отбрасывается и бейдж «залипает».
            const messageId = `${destination}_${cleanedBody}`;
            if (!isDialogStatusDest) {
              if (processedMessagesRef.current.has(messageId)) continue;
              processedMessagesRef.current.add(messageId);
              setTimeout(() => {
                processedMessagesRef.current.delete(messageId);
              }, 10000);
            }

            try {
              const parsedBody = JSON.parse(cleanedBody);

              if (destination === '/user/queue/errors') {
                setLastMessage({
                  data: parsedBody,
                  type: 'error',
                  rawBody: cleanedBody,
                  destination: destination,
                });
                continue;
              }

              if (destination === '/user/queue/unread') {
                // Детализация по диалогам (CLOSED/ACTIVE, те же правила вычитания CLOSED у текущего
                // оператора). Приходит, когда окно диалога открыто. Заполняем карту
                // dialogsUnreadCounts — из неё рендерятся бейджи превью (живое обновление без fetch).
                operatorUnreadDebug('WS ← /user/queue/unread (детальный счётчик по диалогам)', {
                  destination,
                  body: parsedBody,
                  rawBody: cleanedBody,
                });
                const rows = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
                const dialogRows = rows.filter(
                  (d: any) => d && Number(d.dialogId) > 0 && typeof d.countUnMessages === 'number',
                );
                if (dialogRows.length > 0) {
                  useDetailedCountsRef.current = true;
                  hasDetailedDataRef.current = true;
                  dialogRows.forEach((d: any) => {
                    const rowDialogId = Number(d.dialogId);
                    const rowCount = Number(d.countUnMessages);
                    // Нулевой кадр personal-очереди не затирает положительное значение карты:
                    // бэк шлёт 0 по диалогам, уже переданным другому оператору, а REST-список
                    // превью этого оператора ещё содержит диалог с реальным количеством.
                    // Легитимное обнуление делает локальный READ (ChatPanel → updateDialogUnreadCount).
                    if (rowCount === 0) return;
                    updateDialogUnreadCount(rowDialogId, rowCount);
                  });
                } else if (
                  parsedBody &&
                  typeof parsedBody.countUnMessages === 'number' &&
                  !parsedBody.dialogId
                ) {
                  // Резерв: агрегатный объект без dialogId — трактуем как общий счётчик.
                  updateUnreadCountDirect(Number(parsedBody.countUnMessages));
                }
                chatUnreadTrace('socket.frame /user/queue/unread (per-dialog breakdown)', {
                  rows: dialogRows.length,
                });
              } else if (destination === `/queue/unread/${branchIdNorm}`) {
                // ОБЩИЙ агрегат непрочитанных по всем незаблокированным диалогам филиала
                // (CLOSED+ACTIVE). Безусловно обновляем живой счётчик иконки.
                let aggregate: number | null = null;
                if (Array.isArray(parsedBody)) {
                  aggregate = parsedBody.reduce((acc: number, d: any) => {
                    const n = Number(d?.countUnMessages ?? d?.countUnreadMess ?? d?.count ?? 0);
                    return acc + (Number.isFinite(n) ? n : 0);
                  }, 0);
                } else if (parsedBody && typeof parsedBody.countUnMessages === 'number') {
                  aggregate = Number(parsedBody.countUnMessages);
                }
                // Кадр филиала может содержать детализацию по dialogId — обновляем per-dialog карту,
                // чтобы бейджи превью (в т.ч. свёрнутых диалогов) обновлялись в реальном времени.
                // Пишем БЕЗОТОВОРАЧНО (без allowlist): WS-кадр часто приходит РАНЬШЕ REST-ответа,
                // который (пере)создаёт превью. Если отфильтровать по allowlist, значение теряется:
                // REST-список может исключить диалог (его забрал другой оператор), а вернуть — уже
                // после кадра, и бейдж «залипает» на 0.
                if (Array.isArray(parsedBody)) {
                  const perDialogRows = parsedBody.filter(
                    (d: any) =>
                      d && Number(d.dialogId) > 0 && typeof d.countUnMessages === 'number',
                  );
                  if (perDialogRows.length > 0) {
                    perDialogRows.forEach((d: any) => {
                      applyDialogUnreadFromBranchFrame(
                        Number(d.dialogId),
                        Number(d.countUnMessages),
                      );
                    });
                  }
                }
                if (aggregate != null) {
                  updateUnreadCountDirect(aggregate);
                }
                operatorUnreadDebug(
                  'WS ← /queue/unread/{branch} (агрегат для бейджа на иконке чата)',
                  {
                    destination,
                    branchId: branchIdNorm,
                    body: parsedBody,
                    rawBody: cleanedBody,
                    вычисленныйАгрегат: aggregate,
                  },
                );
                chatUnreadTrace('socket.frame /queue/unread/{branch} (aggregate)', {
                  branchId: branchIdNorm,
                  aggregate,
                });
                setLastMessage({
                  data: parsedBody,
                  type: 'DIALOGS_UPDATE',
                  rawBody: cleanedBody,
                  destination: destination,
                  forceRefresh: true,
                });
              } else if (destination === '/user/queue/messages') {
                operatorUnreadDebug('WS ← /user/queue/messages (входящее сообщение, personal)', {
                  destination,
                  body: parsedBody,
                });
                if (!isPayloadForCurrentOperatorBranch(parsedBody)) {
                  continue;
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
                // Allowlist бейджа — сразу по кадру (до setLastMessage).
                applyUnreadAllowlistForDialogStatusFrameRef.current(parsedBody);
                // Принудительно запросить свежий кадр счётчиков из WS-подписок
                // (при смене статуса без нового сообщения бэкенд сам кадр часто не шлёт).
                requestUnreadTopicsRefreshRef.current();
                setLastMessage({
                  data: parsedBody,
                  type: 'DIALOG_STATUS_UPDATE',
                  rawBody: cleanedBody,
                  destination: destination,
                });
              } else if (destination === `/topic/operator/messages/${branchIdNorm}`) {
                operatorUnreadDebug(
                  'WS ← /topic/operator/messages/{branch} (входящее сообщение филиала)',
                  {
                    destination,
                    branchId: branchIdNorm,
                    body: parsedBody,
                  },
                );
                if (!isPayloadForCurrentOperatorBranch(parsedBody)) {
                  continue;
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
          } // end for chunks
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

    const initTimeout = setTimeout(
      () => {
        if (!apiConfig) return;
        if (isElectronOperatorChatPopup() && !getAuthToken()) {
          stompDebugLog('electron popup: defer STOMP init until auth token');
          return;
        }
        initializeWithRetry();
      },
      isElectronOperatorChatPopup() ? 400 : 1000,
    );

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
        unreadAggregateIsLive,
        dialogsUnreadCounts,
        setUnreadCount: updateUnreadCountDirect,
        updateDialogUnreadCount,
        reconcileDialogUnreadFromSessionFeed,
        mergeDialogUnreadFromApi,
        incrementDialogUnreadCount,
        restrictUnreadCountsToDialogIds,
        excludeDialogFromUnreadTotal,
        includeDialogInUnreadTotal,
        requestUnreadTopicsRefresh,
        hasParkedForeignClosedDialogs,
        getParkedForeignClosedDialogIds,
        subscribeParkedForeignClosedDialogs,
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
