import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { appStore } from '@shared/model/app_store/AppStore';
import { handleChatBlockedByAdminResponse } from '@shared/lib/handleChatBlockedByAdmin';
import { getBearerToken } from '@shared/utils/cookie_manager';

import i18n from '../../../i18n';
import {
  clearMainRestoreHandoffMarkers,
  clearMainToOperatorPopupHandoffMarker,
  getChatProviderInitialSessionsHydration,
  hasPendingMainRestoreHandoff,
  hasPendingMainToOperatorPopupHandoff,
  peekDesktopSocketUnreadHandoff,
  clearDesktopSocketUnreadHandoffMarker,
  peekMainRestoreIsChatOpenForMainWindow,
  peekMainReturnHandoffPayload,
} from '../chatPopup/mainChatOpenRestoreFromPopup';
import { CHAT_POPUP_FROM_MAIN_FETCH_ONCE_SESSION_KEY, CHAT_POPUP_OPEN_REST_GENERATION_KEY } from '../chatPopup/constants';
import { isElectronChatShell, isElectronMainChatHost } from '../chatPopup/chatShellEnvironment';
import {
  DESKTOP_AUTH_READY_EVENT,
  isElectronOperatorChatPopup,
} from '../chatPopup/electronPopupAuth';
import { DESKTOP_BRANCH_READY_EVENT } from '../chatPopup/electronPopupSessionBootstrap';
import {
  ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT,
  ELECTRON_POPUP_UNREAD_DIALOGS_LOADED_EVENT,
  fetchElectronPopupUnreadDialogs,
  peekLastElectronPopupUnreadDialogs,
  peekLastElectronPopupUnreadDialogsGeneration,
  readElectronPopupOpenRestGeneration,
} from '../chatPopup/electronPopupUnreadRest';
import { ChatConfig } from '../contexts/chatConfig';
import { UnreadDialog } from '../api/dialogsApi';
import { operatorUnreadDebug } from '../lib/operatorUnreadDebugLog';
import {
  pickSessionMatchingDialogId,
  resolveSessionDialogIdForUnread,
} from '../lib/resolveSessionDialogIdForUnread';
import { useSocket } from './SocketContext';
import { chatUnreadTrace } from './chatUnreadTrace';
import { useChatAttachments } from './hooks/useChatAttachments';
import { useChatDialogHandlers } from './hooks/useChatDialogHandlers';
import { useChatDialogs } from './hooks/useChatDialogs';
import { useChatMessageHandlers } from './hooks/useChatMessageHandlers';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatRefs } from './hooks/useChatRefs';
import { useChatSessions } from './hooks/useChatSessions';
import { useChatStatusHandlers } from './hooks/useChatStatusHandlers';
import { ChatContextType, ChatPagination } from './types/ChatTypes';

const ChatContext = createContext<ChatContextType | null>(null);

function isChatDialogClosedStatus(status: unknown): boolean {
  if (status == null || status === '') return false;
  return String(status).toUpperCase() === 'CLOSED';
}

/**
 * Входит в счётчики как непрочитанное для оператора.
 * Исключаем только исходящие оператору (TO_USER) и уже READ. Для OPEN бэк иногда шлёт
 * другие/пустые messageStatus — если это не TO_USER, считаем входящим.
 */
function isOperatorUnreadForCounters(messageData: any): boolean {
  if (!messageData || messageData.is_read) return false;
  const ms = String(messageData.messageStatus ?? '').toUpperCase();
  if (ms === 'TO_USER') return false;
  return String(messageData.confirmStatus ?? '').toUpperCase() !== 'READ';
}

function buildChatMessageDedupeKey(messageData: any, dialogIdStr: string | null): string {
  const u = messageData?.uuid ?? messageData?.id;
  if (u != null && u !== '') return `u:${u}`;
  const d = dialogIdStr ?? '';
  const ca = String(messageData?.createdAt ?? messageData?.created_at ?? '');
  const t = String(messageData?.text ?? '').slice(0, 48);
  return `d:${d}:${ca}:${t}`;
}

/**
 * Бэк может прислать подтверждение DELIVERED/READ на те же destination, что и обычные сообщения чата.
 * Тогда фрейм не проходит handleIncomingMessage (нет user/dialog) и не доходит до ветки /user/queue/status.
 */
function parseWsChatStatusReceipt(payload: any): {
  statusRaw: string;
  looksLikeChatPayload: boolean;
} | null {
  if (!payload || typeof payload !== 'object') return null;
  const statusRaw = payload.status != null ? String(payload.status).toUpperCase() : '';
  const hasUuidMessage = payload.uuidMessage != null && String(payload.uuidMessage).trim() !== '';
  if (!hasUuidMessage || !['DELIVERED', 'READ', 'SENT'].includes(statusRaw)) {
    return null;
  }
  const looksLikeChatPayload =
    payload.messageStatus === 'TO_USER' ||
    payload.messageStatus === 'TO_OPERATOR' ||
    (payload.text != null && String(payload.text).trim() !== '') ||
    (Array.isArray(payload.attaches) && payload.attaches.length > 0) ||
    (Array.isArray(payload.attachments) && payload.attachments.length > 0) ||
    (Array.isArray(payload.pathsToAttaches) && payload.pathsToAttaches.length > 0);
  return { statusRaw, looksLikeChatPayload };
}

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    // При загрузке в popup-окне чата — сразу открываем диалоговое окно
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.pathname.includes('/operator-chat-popup')) {
        return true;
      }
      const restoredFromPopup = peekMainRestoreIsChatOpenForMainWindow();
      if (restoredFromPopup !== null) {
        return restoredFromPopup;
      }
    }
    return false;
  });
  const [dialogsUnreadCounts, setDialogsUnreadCounts] = useState<Map<number, number>>(new Map());

  const refs = useChatRefs();
  const prevIsChatOpenRef = refs.prevIsChatOpenRef;
  const sessionsRef = useRef<any[]>([]);

  const mainSessionsInitRef = useRef<ReturnType<typeof getChatProviderInitialSessionsHydration> | null>(
    null,
  );
  if (mainSessionsInitRef.current === null) {
    mainSessionsInitRef.current = getChatProviderInitialSessionsHydration();
  }
  const mainSessionsInit = mainSessionsInitRef.current;

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    updateSession,
    getSession,
    createNewSession,
    closeSession,
    toggleSessionMinimize,
    expandSession,
    incrementUnreadCount,
    findSessionByUserId,
    hasSessionWithUser,
    getSessionByUserId,
    removeDuplicateSessions,
    removeEmptySessions,
  } = useChatSessions(
    mainSessionsInit.sessions.length > 0 ? mainSessionsInit.sessions : null,
    mainSessionsInit.sessions.length > 0 ? mainSessionsInit.activeSessionId : null,
  );

  // Синхронно в render (как useChatSessions): иначе Electron REST на открытии popup
  // в useLayoutEffect видит пустой sessionsRef и пропускает countMessages.
  sessionsRef.current = sessions;

  /** После peek в useState init — убираем handoff из storage (не в init: иначе Strict Mode съедает значение). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.includes('/operator-chat-popup')) return;
    if (!hasPendingMainRestoreHandoff()) return;
    const id = window.setTimeout(() => {
      clearMainRestoreHandoffMarkers();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  /** Handoff «основная → popup»: peek в init, ключ снимаем здесь (Strict Mode). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.pathname.includes('/operator-chat-popup')) return;
    if (!hasPendingMainToOperatorPopupHandoff()) return;
    const id = window.setTimeout(() => {
      clearMainToOperatorPopupHandoffMarker();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const {
    sendMessage,
    clearMessages,
    refreshDialogs,
    getUserFullName,
    fetchUserInfo,
    sendTimeouts,
    setSendTimeouts,
    sendMessageStatus,
  } = useChatMessages(sessions, activeSessionId, updateSession, getSession);

  const {
    lastMessage,
    stompClient,
    dialogsUnreadCounts: socketDialogsUnreadCounts,
    reconcileDialogUnreadFromSessionFeed: socketReconcileDialogUnreadFromSessionFeed,
    mergeDialogUnreadFromApi: socketMergeDialogUnreadFromApi,
    incrementDialogUnreadCount: socketIncrementDialogUnreadCount,
    flushIncomingChatMessages,
  } = useSocket();

  const onUnreadDialogsLoaded = useCallback(
    (dialogs: { id: number; countUnreadMess?: number; countUnMessages?: number }[]) => {
      chatUnreadTrace('context.onUnreadDialogsLoaded (API → mergeDialogUnreadFromApi)', {
        dialogCount: dialogs.length,
        rows: dialogs.map((d) => ({
          id: d.id,
          count: d.countUnMessages ?? d.countUnreadMess ?? 0,
        })),
      });
      const currentSessions = sessionsRef.current;
      dialogs.forEach((d) => {
        const count = d.countUnMessages ?? d.countUnreadMess ?? 0;
        const fromSocket = socketDialogsUnreadCounts.get(d.id) ?? 0;
        const isBoundToSession = currentSessions.some(
          (s: any) =>
            String(s.selectedDialog?.id) === String(d.id) ||
            String(s.assignedDialogId) === String(d.id),
        );
        // Уже есть ненулевой счётчик с WS, а REST вернул 0 — лаг API; не перезаписывать карту
        if (isBoundToSession && count === 0 && fromSocket > 0) return;
        socketMergeDialogUnreadFromApi(d.id, count);
      });
    },
    [socketMergeDialogUnreadFromApi, socketDialogsUnreadCounts],
  );

  const hasOtherExpandedSession = useCallback(
    (exceptId: string) => sessions.some((s: any) => !s.isMinimized && s.id !== exceptId),
    [sessions],
  );

  const {
    assignDialog,
    forceLoadUnreadDialogs,
    loadUnreadDialogs,
    loadDialogDetails,
    openUnreadDialog,
    loadingUnreadDialogsRef,
  } = useChatDialogs(
    getSession,
    updateSession,
    onUnreadDialogsLoaded,
    /* После открытия непрочитанного — только выравнивание isMinimized; WS/UI счётчики не трогаем. */
    expandSession,
    hasOtherExpandedSession,
  );

  const {
    uploadAttachments,
    addPendingAttachments,
    setPendingAttachments,
    clearPendingAttachments,
    getPendingAttachments,
  } = useChatAttachments(getSession, updateSession);

  const updateSessionUnreadCount = useCallback(
    (sessionId: string, dialogId: string) => {
      const session =
        sessionsRef.current.find((s: any) => s.id === sessionId) ?? getSession(sessionId);
      if (!session?.messages) return;

      const dialogIdStr = String(dialogId);
      const dialogIdNum = parseInt(dialogIdStr, 10);
      const notReadByBackend = (msg: any) =>
        String(msg.confirmStatus ?? '').toUpperCase() !== 'READ';
      const count = session.messages.filter((msg: any) => {
        const msgDialogId = msg.dialogId?.toString() || msg.dialog?.id?.toString() || '';
        return (
          msgDialogId === dialogIdStr &&
          msg.messageStatus === 'TO_OPERATOR' &&
          (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
          !msg.is_read &&
          notReadByBackend(msg)
        );
      }).length;
      // Пока confirmStatus не SENT/DELIVERED, строгий счётчик 0, но сообщение уже непрочитано —
      // иначе socketIncrement перезаписывается нулём (см. логи setDialogUnread absolute 0 сразу после increment).
      const relaxedUnread = session.messages.filter((msg: any) => {
        const msgDialogId = msg.dialogId?.toString() || msg.dialog?.id?.toString() || '';
        return (
          msgDialogId === dialogIdStr &&
          msg.messageStatus === 'TO_OPERATOR' &&
          !msg.is_read &&
          notReadByBackend(msg)
        );
      }).length;
      const countForSocket = Math.max(count, relaxedUnread);
      const hasAnyMessageForDialog = session.messages.some((msg: any) => {
        const msgDialogId = msg.dialogId?.toString() || msg.dialog?.id?.toString() || '';
        return msgDialogId === dialogIdStr;
      });
      if (isNaN(dialogIdNum)) {
        updateSession(sessionId, { unreadCount: countForSocket });
        return;
      }

      /** Карту обновляем через functional setState с prev — иначе после абсолютного WS (=1) пересчёт
       * с устаревшим snapshot из пропсов пишет 0 и затирает бейдж (естьСообщенияДиалогаВЛенте: false). */
      socketReconcileDialogUnreadFromSessionFeed(
        dialogIdNum,
        countForSocket,
        hasAnyMessageForDialog,
        (next, prevSocket) => {
          operatorUnreadDebug('Пересчёт непрочитанных → сессия и WS-карта', {
            sessionId,
            dialogId: dialogIdStr,
            свёрнута: session.isMinimized,
            строгоВЛенте: count,
            расширенныйПодсчёт: relaxedUnread,
            вКартуПишем: next,
            былоВКартеWs: prevSocket,
            естьСообщенияДиалогаВЛенте: hasAnyMessageForDialog,
            подсчётПоЛентеДляСессии: countForSocket,
            примечание:
              !hasAnyMessageForDialog && countForSocket === 0 && prevSocket > 0
                ? 'лента пуста по dialogId — не затираем prev в Map'
                : undefined,
          });
          updateSession(sessionId, { unreadCount: next });
        },
      );
    },
    [getSession, updateSession, socketReconcileDialogUnreadFromSessionFeed],
  );

  const recalculateSessionUnreadCount = useCallback(
    (sessionId: string, dialogId?: string) => {
      const session =
        sessionsRef.current.find((s: any) => s.id === sessionId) ?? getSession(sessionId);
      if (!session?.messages) return;

      const resolved = resolveSessionDialogIdForUnread(session);
      const effectiveDialogId =
        dialogId ||
        (resolved != null ? String(resolved) : undefined) ||
        session.selectedDialog?.id?.toString() ||
        session.assignedDialogId ||
        session.messages[0]?.dialog?.id?.toString() ||
        session.messages[0]?.dialogId?.toString();

      if (effectiveDialogId) {
        updateSessionUnreadCount(sessionId, effectiveDialogId);
      } else {
        const count = session.messages.filter(
          (msg: any) =>
            msg.messageStatus === 'TO_OPERATOR' &&
            (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
            !msg.is_read &&
            String(msg.confirmStatus ?? '').toUpperCase() !== 'READ',
        ).length;
        updateSession(sessionId, { unreadCount: count });
      }
    },
    [getSession, updateSessionUnreadCount, updateSession],
  );

  const statusHandlers = useChatStatusHandlers(refs, {
    getSession,
    updateSession,
    sendMessageStatus: (uuid: string, status: 'DELIVERED' | 'READ') => {
      return sendMessageStatus(uuid, status);
    },
    recalculateSessionUnreadCount,
  });

  const dialogHandlers = useChatDialogHandlers(refs, {
    getSession,
    updateSession,
    assignDialog,
  });

  const popupHandoffHydratedRef = useRef(false);
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.includes('/operator-chat-popup')) return;
    // Electron main: отдельное popup-окно; здесь REST countMessages запрещён.
    // Иначе при закрытии popup handoff в LS + смена deps эффекта шлёт запросы в Network main.
    if (isElectronMainChatHost()) {
      popupHandoffHydratedRef.current = true;
      return;
    }
    if (popupHandoffHydratedRef.current) return;
    const p = peekMainReturnHandoffPayload();
    if (!p || p.v !== 2) return;
    popupHandoffHydratedRef.current = true;
    if (!p.sessions?.length) return;

    for (const row of p.sessions) {
      const hasDid =
        (row.selectedDialogId != null &&
          String(row.selectedDialogId) !== '' &&
          String(row.selectedDialogId) !== '0' &&
          String(row.selectedDialogId) !== 'assigned') ||
        (row.assignedDialogId != null &&
          String(row.assignedDialogId) !== '' &&
          String(row.assignedDialogId) !== '0' &&
          String(row.assignedDialogId) !== 'assigned');
      if (hasDid) {
        void dialogHandlers.forceRefreshSessionMessages(row.id);
      }
      void forceLoadUnreadDialogs(row.id);
    }
  }, [dialogHandlers, forceLoadUnreadDialogs]);

  const popupFromMainHydratedRef = useRef(false);
  const electronDesktopUnreadHandoffRef = useRef(peekDesktopSocketUnreadHandoff());
  const electronHandoffUnreadSyncedRef = useRef(false);
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.pathname.includes('/operator-chat-popup')) return;
    if (!mainSessionsInit.fromMainToPopup) return;
    if (!isElectronChatShell()) return;
    if (electronHandoffUnreadSyncedRef.current) return;
    if (sessions.length === 0) return;

    const handoff = electronDesktopUnreadHandoffRef.current;
    if (!handoff) {
      electronHandoffUnreadSyncedRef.current = true;
      return;
    }

    electronHandoffUnreadSyncedRef.current = true;

    for (const session of sessions) {
      const fromSessionHandoff = handoff.sessionUnread.get(session.id) ?? 0;
      const dialogId = resolveSessionDialogIdForUnread(session);
      const fromMap =
        dialogId != null ? (handoff.dialogsUnreadCounts.get(dialogId) ?? 0) : 0;
      const fromMessages =
        dialogId != null
          ? (session.messages ?? []).reduce((acc: number, msg: any) => {
              const mid = Number(msg.dialogId ?? msg.dialog?.id ?? NaN);
              if (mid !== Number(dialogId)) return acc;
              if (msg.messageStatus !== 'TO_OPERATOR') return acc;
              if (msg.is_read) return acc;
              if (String(msg.confirmStatus ?? '').toUpperCase() === 'READ') return acc;
              return acc + 1;
            }, 0)
          : 0;
      const nextUnread = Math.max(
        session.unreadCount ?? 0,
        fromSessionHandoff,
        fromMap,
        fromMessages,
      );
      if (nextUnread > (session.unreadCount ?? 0)) {
        updateSession(session.id, { unreadCount: nextUnread });
      }
    }

    const id = window.setTimeout(() => clearDesktopSocketUnreadHandoffMarker(), 500);
    return () => window.clearTimeout(id);
  }, [mainSessionsInit.fromMainToPopup, sessions, updateSession]);

  /** Electron popup: REST dialogs?countMessages на каждое открытие окна (как web). */
  const electronPopupRestGenerationRef = useRef<string | null>(null);
  const electronPopupUnreadAppliedGenerationRef = useRef<string | null>(null);
  const electronPopupUnreadFetchInflightRef = useRef(false);

  const applyElectronPopupUnreadList = useCallback(
    (list: UnreadDialog[]) => {
      const generation = readElectronPopupOpenRestGeneration() ?? 'default';
      if (electronPopupUnreadAppliedGenerationRef.current === generation) return;

      const current = sessionsRef.current;
      if (current.length === 0) return;

      electronPopupUnreadAppliedGenerationRef.current = generation;

      current.forEach((s: { id: string }) => {
        updateSession(s.id, {
          unreadDialogs: list,
          isLoadingUnreadDialogs: false,
        });
      });
      onUnreadDialogsLoaded(list);
    },
    [onUnreadDialogsLoaded, updateSession],
  );

  const runElectronPopupUnreadRest = useCallback(async () => {
    if (!isElectronOperatorChatPopup()) return;
    if (!getBearerToken()) return;

    const generation = readElectronPopupOpenRestGeneration() ?? 'default';
    if (generation !== electronPopupRestGenerationRef.current) {
      electronPopupRestGenerationRef.current = generation;
      electronPopupUnreadAppliedGenerationRef.current = null;
    }

    if (electronPopupUnreadAppliedGenerationRef.current === generation) return;
    if (sessionsRef.current.length === 0) return;
    if (electronPopupUnreadFetchInflightRef.current) return;

    electronPopupUnreadFetchInflightRef.current = true;
    try {
      const list = await fetchElectronPopupUnreadDialogs();
      if (list !== null) {
        applyElectronPopupUnreadList(list);
        for (const s of sessionsRef.current) {
          const hasDid =
            (s.selectedDialog?.id != null &&
              String(s.selectedDialog.id) !== '' &&
              String(s.selectedDialog.id) !== '0' &&
              String(s.selectedDialog.id) !== 'assigned') ||
            (s.assignedDialogId != null &&
              String(s.assignedDialogId) !== '' &&
              String(s.assignedDialogId) !== '0' &&
              String(s.assignedDialogId) !== 'assigned');
          if (hasDid) {
            void dialogHandlers.forceRefreshSessionMessages(s.id);
          }
        }
      }
    } finally {
      electronPopupUnreadFetchInflightRef.current = false;
    }
  }, [applyElectronPopupUnreadList, dialogHandlers]);

  useLayoutEffect(() => {
    if (!isElectronOperatorChatPopup()) return;

    runElectronPopupUnreadRest();

    let attempts = 0;
    const pollId = window.setInterval(() => {
      attempts += 1;
      runElectronPopupUnreadRest();
      if (attempts >= 50) {
        window.clearInterval(pollId);
      }
    }, 200);

    const onSignal = () => runElectronPopupUnreadRest();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CHAT_POPUP_OPEN_REST_GENERATION_KEY) return;
      electronPopupRestGenerationRef.current = null;
      electronPopupUnreadAppliedGenerationRef.current = null;
      void runElectronPopupUnreadRest();
    };
    window.addEventListener(DESKTOP_AUTH_READY_EVENT, onSignal);
    window.addEventListener(DESKTOP_BRANCH_READY_EVENT, onSignal);
    window.addEventListener(ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT, onSignal);
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener(DESKTOP_AUTH_READY_EVENT, onSignal);
      window.removeEventListener(DESKTOP_BRANCH_READY_EVENT, onSignal);
      window.removeEventListener(ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT, onSignal);
      window.removeEventListener('storage', onStorage);
    };
  }, [runElectronPopupUnreadRest]);

  useEffect(() => {
    if (!isElectronOperatorChatPopup()) return;
    runElectronPopupUnreadRest();
  }, [sessions, runElectronPopupUnreadRest]);

  /** Событие fetch из OperatorChatPopupPage — применить, когда сессии уже есть. */
  useEffect(() => {
    if (!isElectronOperatorChatPopup()) return;

    const onLoaded = (event: Event) => {
      const list = (event as CustomEvent).detail;
      if (!Array.isArray(list)) return;
      applyElectronPopupUnreadList(list as UnreadDialog[]);
    };

    const buffered = peekLastElectronPopupUnreadDialogs();
    const bufferedGen = peekLastElectronPopupUnreadDialogsGeneration();
    const currentGen = readElectronPopupOpenRestGeneration() ?? 'default';
    if (buffered && bufferedGen === currentGen) {
      applyElectronPopupUnreadList(buffered);
    }

    window.addEventListener(ELECTRON_POPUP_UNREAD_DIALOGS_LOADED_EVENT, onLoaded);
    return () => {
      window.removeEventListener(ELECTRON_POPUP_UNREAD_DIALOGS_LOADED_EVENT, onLoaded);
    };
  }, [applyElectronPopupUnreadList, sessions]);

  useLayoutEffect(() => {
    if (!isElectronOperatorChatPopup()) return;
    try {
      sessionStorage.removeItem(CHAT_POPUP_FROM_MAIN_FETCH_ONCE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.pathname.includes('/operator-chat-popup')) return;
    if (isElectronOperatorChatPopup()) return;
    if (!mainSessionsInit.fromMainToPopup) return;
    if (sessions.length === 0) return;

    let skipFetch = false;
    try {
      if (sessionStorage.getItem(CHAT_POPUP_FROM_MAIN_FETCH_ONCE_SESSION_KEY) === '1') {
        skipFetch = true;
      } else {
        sessionStorage.setItem(CHAT_POPUP_FROM_MAIN_FETCH_ONCE_SESSION_KEY, '1');
      }
    } catch {
      if (popupFromMainHydratedRef.current) {
        skipFetch = true;
      } else {
        popupFromMainHydratedRef.current = true;
      }
    }
    if (skipFetch) return;

    // Electron popup: та же REST-гидратация, что в web/PWA popup.
    if (isElectronMainChatHost()) return;

    for (const s of sessions) {
      const hasDid =
        (s.selectedDialog?.id != null &&
          String(s.selectedDialog.id) !== '' &&
          String(s.selectedDialog.id) !== '0' &&
          String(s.selectedDialog.id) !== 'assigned') ||
        (s.assignedDialogId != null &&
          String(s.assignedDialogId) !== '' &&
          String(s.assignedDialogId) !== '0' &&
          String(s.assignedDialogId) !== 'assigned');
      if (hasDid) {
        void dialogHandlers.forceRefreshSessionMessages(s.id);
      }
      void forceLoadUnreadDialogs(s.id);
    }
  }, [dialogHandlers, forceLoadUnreadDialogs, mainSessionsInit.fromMainToPopup, sessions]);

  const messageHandlers = useChatMessageHandlers(refs, {
    getSession,
    updateSession,
    sendMessageStatus: (uuid: string, status: 'DELIVERED' | 'READ') => {
      return sendMessageStatus(uuid, status);
    },
    refreshDialogHistory: dialogHandlers.refreshDialogHistory,
  });

  const enhancedCreateNewSession = useCallback(
    (options?: { asMinimized?: boolean }): string => {
      const sessionId = createNewSession(options);
      refs.sessionCreationTimeRef.current.set(sessionId, Date.now());

      const defaultPagination: ChatPagination = {
        currentPage: 0,
        totalPages: 0,
        totalElements: 0,
        isLoadingMore: false,
        isLoadingNext: false,
        hasMoreMessages: false,
        hasNextMessages: false,
      };

      setTimeout(() => {
        updateSession(sessionId, {
          lastSendError: null,
          assignedDialogId: null,
          selectedDialog: null,
          selectedUsers: [],
          selectedUserName: '',
          messages: [],
          uploadedAttachments: [],
          pendingAttachments: [],
          isSendingMessage: false,
          hasSentMessage: false,
          transferRecipientFullName: null,
          pagination: defaultPagination,
        });
      }, 50);

      return sessionId;
    },
    [createNewSession, updateSession, refs.sessionCreationTimeRef],
  );

  const safeRefreshDialogs = useCallback(
    (sessionId: string) => {
      if (refs.refreshDialogsInProgressRef.current.has(sessionId)) return;
      refs.refreshDialogsInProgressRef.current.add(sessionId);

      refreshDialogs(sessionId);
      setTimeout(() => refs.refreshDialogsInProgressRef.current.delete(sessionId), 2000);
    },
    [refreshDialogs],
  );

  const refreshAllOpenSessions = useCallback(() => {
    sessions.forEach((session: any) => {
      if (!session.isMinimized && session.selectedUsers.length > 0) {
        const existingTimeout = refs.refreshMessagesDebounceRef.current.get(session.id);
        if (existingTimeout) clearTimeout(existingTimeout);

        const newTimeout = setTimeout(() => {
          dialogHandlers.autoRefreshOpenSessionMessages(session.id);
          refs.refreshMessagesDebounceRef.current.delete(session.id);
        }, 1000);

        refs.refreshMessagesDebounceRef.current.set(session.id, newTimeout);
      }
    });
  }, [sessions, dialogHandlers.autoRefreshOpenSessionMessages, refs.refreshMessagesDebounceRef]);

  const updateUnreadCountsFromWebSocket = useCallback(
    (dialogUpdates: any[]) => {
      if (!Array.isArray(dialogUpdates) || dialogUpdates.length === 0) return;

      const newCounts = new Map(dialogsUnreadCounts);
      let hasChanges = false;

      dialogUpdates.forEach((dialogData: any) => {
        if (dialogData.dialogId && typeof dialogData.countUnMessages === 'number') {
          const dialogId = dialogData.dialogId.toString();
          const newCount = dialogData.countUnMessages;
          const oldCount = newCounts.get(parseInt(dialogId)) || 0;

          if (newCount !== oldCount) {
            newCounts.set(parseInt(dialogId), newCount);
            hasChanges = true;
          }
        }
      });

      chatUnreadTrace('context.updateUnreadCountsFromWebSocket (локальная Map в ChatProvider)', {
        hasChanges,
        updates: dialogUpdates,
        note: 'Рендер бейджей в футере берёт Map из SocketContext, не отсюда',
      });
      if (hasChanges) setDialogsUnreadCounts(newCounts);
    },
    [dialogsUnreadCounts],
  );

  const handleSetIsChatOpen = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        sessions.forEach((session: any) => clearMessages(session.id));
        refs.loadingSessionsRef.current.clear();
        loadingUnreadDialogsRef.current.clear();
        sendTimeouts.forEach((timeout: any) => clearTimeout(timeout));
        setSendTimeouts(new Map());

        const refsToClear = [
          refs.accessDeniedProcessingRef,
          refs.sessionCreationTimeRef,
          refs.statusSendingInProgressRef,
          refs.processedDialogStatusesRef,
          refs.deliveredStatusesRef,
          refs.failedStatusAttemptsRef,
          refs.processedIncomingMessagesRef,
          refs.deliveredSendingInProgressRef,
          refs.lastDeliveredSendTimeRef,
          refs.refreshDialogsInProgressRef,
          refs.processedDeliveryConfirmsRef,
          refs.lastSessionRefreshRef,
          refs.refreshingSessionsRef,
          refs.loadedDialogsHistoryRef,
          refs.processedReadStatusesRef,
          refs.readStatusTimestampsRef,
          refs.pendingReadAfterDeliveredConfirmRef,
          refs.deliveredConfirmedByBackendRef,
          refs.historyRefreshInProgressRef,
          refs.refreshMessagesDebounceRef,
          refs.loadingMoreMessagesRef,
          refs.messagesPaginationStateRef,
          refs.loadMoreTimeoutsRef,
          refs.dialogLoadingInProgressRef,
          refs.loadHistoryInProgressRef,
          refs.dialogTotalElementsCacheRef,
          refs.lastDialogHistoryUpdateRef,
          refs.syncHistoryDebounceRef,
          refs.recentLocalMessagesRef,
          refs.loadedPagesRef,
          refs.pageLoadingInProgressRef,
          refs.lastScrollTimeRef,
        ];

        refsToClear.forEach((ref) => ref.current.clear());
      } else {
        if (sessions.length === 0) {
          const newSessionId = enhancedCreateNewSession();
          if (newSessionId) forceLoadUnreadDialogs(newSessionId);
        }
      }

      prevIsChatOpenRef.current = isOpen;
      setIsChatOpen(isOpen);
    },
    [
      sessions,
      clearMessages,
      sendTimeouts,
      enhancedCreateNewSession,
      forceLoadUnreadDialogs,
      setSendTimeouts,
      loadingUnreadDialogsRef,
      refs,
      prevIsChatOpenRef,
    ],
  );

  const handleDialogStatusUpdate = useCallback(
    (dialogStatusData: any) => {
      const { dialogId, dialogStatus } = dialogStatusData;

      if (!dialogId || !dialogStatus) return;

      sessions.forEach((session: any) => {
        const liveSession = getSession(session.id);
        if (!liveSession) return;
        const sessionDialogId = liveSession.selectedDialog?.id || liveSession.assignedDialogId;

        if (sessionDialogId && sessionDialogId.toString() === dialogId.toString()) {
          const incomingLastOperator =
            dialogStatusData?.lastOperator ??
            dialogStatusData?.last_operator ??
            dialogStatusData?.dialog?.lastOperator ??
            dialogStatusData?.dialog?.last_operator;

          updateSession(session.id, {
            selectedDialog: {
              ...liveSession.selectedDialog,
              status: dialogStatus,
              ...(dialogStatus === 'CLOSED' && incomingLastOperator != null
                ? { lastOperator: incomingLastOperator }
                : {}),
              ...(dialogStatus !== 'CLOSED' ? { lastOperator: null } : {}),
            },
            ...(dialogStatus !== 'CLOSED' && { assignedDialogId: null }),
          });

          if (dialogStatus !== 'CLOSED') {
            updateSession(session.id, {
              lastSendError: null,
              transferRecipientFullName: null,
            });
          }

          const parsedDialogId = Number(dialogId);
          if (Number.isFinite(parsedDialogId)) {
            loadDialogDetails(parsedDialogId)
              .then((freshDialog: any) => {
                if (!freshDialog || typeof freshDialog !== 'object') return;
                const live = getSession(session.id);
                if (!live) return;
                const freshStatus = freshDialog.status;
                const freshLo = freshDialog.lastOperator ?? freshDialog.last_operator;
                updateSession(session.id, {
                  selectedDialog: {
                    ...(live.selectedDialog || {}),
                    ...freshDialog,
                    ...(freshStatus != null ? { status: freshStatus } : {}),
                    ...(freshLo != null ? { lastOperator: freshLo } : {}),
                    ...(freshStatus !== 'CLOSED' ? { lastOperator: null } : {}),
                  },
                  ...(freshStatus !== 'CLOSED' ? { assignedDialogId: null } : {}),
                  ...(freshStatus !== 'CLOSED'
                    ? { transferRecipientFullName: null, lastSendError: null }
                    : {}),
                });
              })
              .catch((): void => {});
          }
        }
      });
    },
    [sessions, getSession, updateSession, loadDialogDetails],
  );

  const handleStatusUpdate = useCallback(
    (statusData: any) => {
      const { uuidMessage, status, servetAsk, serverAsk } = statusData;
      const needConfirm = servetAsk === 'RECEIVED' || serverAsk === 'RECEIVED';

      if (!uuidMessage || !status) return;

      const statusKey = `${uuidMessage}_${status}`;
      if (refs.processedDeliveryConfirmsRef.current.has(statusKey)) {
        return;
      }

      refs.processedDeliveryConfirmsRef.current.add(statusKey);
      setTimeout(() => {
        refs.processedDeliveryConfirmsRef.current.delete(statusKey);
      }, 5000);

      if (needConfirm && stompClient?.connected) {
        const confirmMessage = {
          uuidMessage,
          status,
          servetAsk: 'CONFIRMED',
        };

        try {
          stompClient.publish({
            destination: '/app/chat.status.confirm',
            body: JSON.stringify(confirmMessage),
            headers: { 'content-type': 'application/json' },
          });
        } catch (error) {
          console.error('Ошибка подтверждения статуса:', error);
        }
      }

      if (status !== 'READ' && refs.processedReadStatusesRef.current.has(uuidMessage)) return;

      sessions.forEach((session: any) => {
        const messageIndex = session.messages.findIndex((msg: any) => msg.uuid === uuidMessage);
        if (messageIndex !== -1) {
          const currentMessage = session.messages[messageIndex];
          const currentStatus = currentMessage.confirmStatus;
          const statusOrder = { SENT: 1, DELIVERED: 2, READ: 3 } as any;

          if (statusOrder[status] <= (statusOrder[currentStatus] || 0)) {
            return;
          }

          const updatedMessages = [...session.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            confirmStatus: status,
            ...(status === 'READ' && { is_read: true }),
          };

          updateSession(session.id, { messages: updatedMessages });

          if (status === 'READ') {
            refs.processedReadStatusesRef.current.add(uuidMessage);
            const dialogId =
              currentMessage.dialog?.id?.toString() || currentMessage.dialogId?.toString();
            setTimeout(() => recalculateSessionUnreadCount(session.id, dialogId), 150);
          } else if (status === 'DELIVERED') {
            refs.deliveredStatusesRef.current.add(uuidMessage);
            refs.deliveredConfirmedByBackendRef.current.add(uuidMessage);
          }
        }
      });

      if (status === 'DELIVERED') {
        const pendingSessionId = refs.pendingReadAfterDeliveredConfirmRef.current.get(uuidMessage);
        if (pendingSessionId) {
          const isMessageVisible = (): boolean => {
            const messageElementByUuid = document.querySelector(
              `[data-message-uuid="${uuidMessage}"]`,
            );
            const messageElementById = document.getElementById(`message-${uuidMessage}`);
            const messageElement = messageElementByUuid || messageElementById;

            if (!messageElement) return false;

            const scrollContainer = messageElement.closest(
              '[data-session-id], [class*="feed"], [class*="Feed"]',
            );
            if (!scrollContainer) return false;

            const containerRect = scrollContainer.getBoundingClientRect();
            const messageRect = messageElement.getBoundingClientRect();

            const isVisible =
              messageRect.top < containerRect.bottom &&
              messageRect.bottom > containerRect.top &&
              messageRect.left < containerRect.right &&
              messageRect.right > containerRect.left;

            return isVisible;
          };

          if (!isMessageVisible()) return;

          refs.pendingReadAfterDeliveredConfirmRef.current.delete(uuidMessage);
          refs.processedReadStatusesRef.current.add(uuidMessage);
          const sent = sendMessageStatus(uuidMessage, 'READ');
          if (sent) {
            const session = getSession(pendingSessionId);
            if (session?.messages) {
              const msg = session.messages.find((m: any) => m.uuid === uuidMessage);
              const dialogId = msg?.dialog?.id?.toString() || msg?.dialogId?.toString();
              const updatedMessages = session.messages.map((m: any) =>
                m.uuid === uuidMessage ? { ...m, confirmStatus: 'READ', is_read: true } : m,
              );
              updateSession(pendingSessionId, { messages: updatedMessages });
              setTimeout(() => recalculateSessionUnreadCount(pendingSessionId, dialogId), 150);
            }
          }
        }
      }
    },
    [
      sessions,
      updateSession,
      stompClient,
      getSession,
      statusHandlers,
      recalculateSessionUnreadCount,
      refs.processedDeliveryConfirmsRef,
      refs.processedReadStatusesRef,
      refs.deliveredStatusesRef,
      refs.deliveredConfirmedByBackendRef,
    ],
  );

  const handleIncomingMessage = useCallback(
    async (messageData: any) => {
      const messageDialogId = messageData.dialog?.id ?? messageData.dialogId;
      const dialogIdStr = messageDialogId != null ? String(messageDialogId) : null;

      const incomingUserIdRaw =
        messageData?.createdBy?.id ??
        messageData?.dialog?.owner?.id ??
        messageData?.user?.id ??
        messageData?.clientInfo?.id ??
        messageData?.clientInfo?.userId ??
        messageData?.senderInfo?.id;

      const allowDialogOnlyMatch =
        (incomingUserIdRaw == null || incomingUserIdRaw === '') &&
        dialogIdStr != null &&
        String(messageData?.messageStatus ?? '').toUpperCase() !== 'TO_USER';

      if ((incomingUserIdRaw == null || incomingUserIdRaw === '') && !allowDialogOnlyMatch) {
        return;
      }

      const processingKey = buildChatMessageDedupeKey(messageData, dialogIdStr);
      if (refs.processedIncomingMessagesRef.current.has(processingKey)) {
        return;
      }
      refs.processedIncomingMessagesRef.current.add(processingKey);
      setTimeout(() => refs.processedIncomingMessagesRef.current.delete(processingKey), 120_000);

      const currentSessions = sessionsRef.current;
      const resolvedUserIdForMatch = incomingUserIdRaw ?? messageData?.dialog?.owner?.id ?? null;
      const userIdNum =
        resolvedUserIdForMatch != null && resolvedUserIdForMatch !== ''
          ? parseInt(String(resolvedUserIdForMatch), 10)
          : NaN;

      // Сначала явная привязка к dialogId / превью непрочитанных / истории — иначе find по userId
      // захватывает развёрнутое окно, и сообщение «перекидывает» диалог в основную панель.
      let existingSession: (typeof currentSessions)[number] | undefined;
      let foundViaUnreadDialogs = false;

      if (dialogIdStr) {
        existingSession = pickSessionMatchingDialogId(
          currentSessions,
          dialogIdStr,
          Number.isNaN(userIdNum) ? undefined : userIdNum,
        );
      }
      if (!existingSession && dialogIdStr && currentSessions.length > 0) {
        existingSession = currentSessions.find((s) =>
          s.messages?.some((m: any) => String(m.dialog?.id ?? m.dialogId ?? '') === dialogIdStr),
        );
      }
      if (!existingSession && dialogIdStr) {
        const sessionWithUnread = currentSessions.find((s) =>
          s.unreadDialogs?.some(
            (d: any) => String(d.id) === dialogIdStr || d.id?.toString() === dialogIdStr,
          ),
        );
        if (sessionWithUnread) {
          const matchingDialog = sessionWithUnread.unreadDialogs?.find(
            (d: any) => String(d.id) === dialogIdStr || d.id?.toString() === dialogIdStr,
          );
          if (matchingDialog) {
            existingSession = sessionWithUnread;
            foundViaUnreadDialogs = true;
          } else if (messageData.dialog) {
            existingSession = sessionWithUnread;
            foundViaUnreadDialogs = true;
          }
        }
      }
      if (!existingSession && !Number.isNaN(userIdNum) && userIdNum > 0) {
        existingSession = currentSessions.find(
          (s) =>
            s.selectedUsers && s.selectedUsers.length > 0 && s.selectedUsers.includes(userIdNum),
        );
      }
      if (!existingSession && messageData.dialog?.owner?.id) {
        const ownerId = parseInt(String(messageData.dialog.owner.id), 10);
        if (!isNaN(ownerId)) {
          existingSession = currentSessions.find(
            (s) => s.selectedUsers && s.selectedUsers.includes(ownerId),
          );
        }
      }

      if (existingSession) {
        // Не открывать диалог в основной панели по WS (ни openUnread, ни подмена selectedDialog) —
        // только счётчики, сообщения в сессию и превью; раскрытие — по клику оператора.
        if (foundViaUnreadDialogs && dialogIdStr) {
          sessionsRef.current.forEach((s: any) => {
            if (
              s.id !== existingSession.id &&
              s.unreadDialogs?.some(
                (d: any) => String(d.id) === dialogIdStr || d.id?.toString() === dialogIdStr,
              )
            ) {
              updateSession(s.id, {
                unreadDialogs: s.unreadDialogs.filter(
                  (d: any) => String(d.id) !== dialogIdStr && d.id?.toString() !== dialogIdStr,
                ),
              });
            }
          });
        }

        const activeDialogIdRaw =
          existingSession.selectedDialog?.id != null &&
          String(existingSession.selectedDialog.id) !== '0'
            ? String(existingSession.selectedDialog.id)
            : existingSession.assignedDialogId != null &&
                String(existingSession.assignedDialogId) !== '0' &&
                String(existingSession.assignedDialogId) !== 'assigned'
              ? String(existingSession.assignedDialogId)
              : null;

        const ownerMatchesSession =
          existingSession.selectedUsers &&
          existingSession.selectedUsers.length > 0 &&
          !Number.isNaN(userIdNum) &&
          userIdNum > 0 &&
          existingSession.selectedUsers.includes(userIdNum);

        // Не смешивать ленту: другой выбранный диалог — не капаем. Если dialogId ещё не привязан к сессии,
        // но владелец совпадает — капаем. Если в метаданных «чужой» dialogId, но владелец сообщения = эта сессия —
        // капаем (восстановление метаданных в addMessageFromWebSocket).
        const shouldAppendMessageToSession =
          dialogIdStr == null ||
          (activeDialogIdRaw != null && activeDialogIdRaw === dialogIdStr) ||
          (activeDialogIdRaw == null && Boolean(ownerMatchesSession) && dialogIdStr != null) ||
          (activeDialogIdRaw != null &&
            dialogIdStr != null &&
            activeDialogIdRaw !== dialogIdStr &&
            Boolean(ownerMatchesSession));

        if (shouldAppendMessageToSession) {
          await messageHandlers.addMessageFromWebSocket(existingSession.id, messageData);
        }

        const messageDialogId = messageData.dialog?.id ?? messageData.dialogId;
        if (messageDialogId != null && isOperatorUnreadForCounters(messageData)) {
          socketIncrementDialogUnreadCount(Number(messageDialogId), 1, processingKey);
        }

        if (!existingSession.isMinimized) {
          setActiveSessionId(existingSession.id);
        }

        const didExpand = false;

        refreshAllOpenSessions();

        const dialogId = messageData.dialog?.id;
        if (ChatConfig.DISABLE_PAGINATION && dialogId) {
          messageHandlers.debouncedSyncDialogHistory(existingSession.id, dialogId.toString());
        }

        if (existingSession.isMinimized && !didExpand) {
          if (isOperatorUnreadForCounters(messageData)) {
            incrementUnreadCount(existingSession.id, 1);
          }
        }

        /* Свёрнутая и развёрнутая: пересчёт session.unreadCount и стыковка с WS-картой (раньше только для развёрнутой — бейджи превью не жили онлайн). */
        const messageDialogIdForUnread = messageData.dialog?.id || messageData.dialogId;
        const sessionDialogIdFallback =
          existingSession.selectedDialog?.id || existingSession.assignedDialogId;

        setTimeout(() => {
          if (isElectronChatShell()) return;
          if (messageDialogIdForUnread) {
            updateSessionUnreadCount(existingSession.id, messageDialogIdForUnread.toString());
          } else if (sessionDialogIdFallback && sessionDialogIdFallback !== '0') {
            updateSessionUnreadCount(existingSession.id, sessionDialogIdFallback.toString());
          }
        }, 200);

        if (
          messageData.uuid &&
          !refs.deliveredStatusesRef.current.has(messageData.uuid) &&
          messageData.messageStatus === 'TO_OPERATOR' &&
          messageData.confirmStatus === 'SENT'
        ) {
          setTimeout(() => {
            const currentSession = getSession(existingSession.id);
            if (!currentSession) return;
            const dialogSt = currentSession.selectedDialog?.status;
            const incomingClosed = isChatDialogClosedStatus(messageData.dialog?.status);
            if (!dialogSt && !incomingClosed) return;
            // CLOSED по сессии или по самому сообщению (selectedDialog иногда не CLOSED при несоответствии).
            const treatAsClosed = incomingClosed || isChatDialogClosedStatus(dialogSt);
            if (treatAsClosed && (!isChatOpen || currentSession.isMinimized)) {
              return;
            }
            const sendResult = statusHandlers.sendDeliveredStatusForNewMessage(
              existingSession.id,
              messageData.uuid,
            );
            if (sendResult) {
              refs.deliveredStatusesRef.current.add(messageData.uuid);
            }
          }, 1000);
        }

        return;
      } else {
        const dialogId = messageData.dialog?.id ?? messageData.dialogId;
        const dialogIdStr = dialogId != null ? String(dialogId) : null;

        // Вход по WS при пустых сессиях: не разворачивать главное окно — только мини-превью (как у «только иконка чата»).
        const newSessionId = enhancedCreateNewSession({ asMinimized: true });

        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 50));
          if (getSession(newSessionId)) break;
        }

        if (dialogId && messageData.dialog) {
          const ownerName = messageData.dialog.owner?.fullName || messageData.createdBy?.fullName;
          updateSession(newSessionId, {
            selectedDialog: {
              ...messageData.dialog,
              client_name: ownerName || messageData.dialog.client_name,
            },
            assignedDialogId: messageData.dialog.id?.toString() ?? String(dialogId),
            selectedUserName: ownerName,
            selectedUsers: messageData.dialog.owner?.id ? [messageData.dialog.owner.id] : [],
          });
        }

        if (dialogIdStr && !isElectronMainChatHost()) {
          await forceLoadUnreadDialogs(newSessionId);
          await dialogHandlers.loadDialogHistory(newSessionId, dialogIdStr, true, 0, true);
        }

        if (dialogIdStr) {
          [...sessionsRef.current, getSession(newSessionId)].filter(Boolean).forEach((s: any) => {
            if (
              s?.unreadDialogs?.some(
                (d: any) => String(d.id) === dialogIdStr || d.id?.toString() === dialogIdStr,
              )
            ) {
              updateSession(s.id, {
                unreadDialogs: s.unreadDialogs.filter(
                  (d: any) => String(d.id) !== dialogIdStr && d.id?.toString() !== dialogIdStr,
                ),
              });
            }
          });
        }

        await messageHandlers.addMessageFromWebSocket(newSessionId, messageData);

        if (dialogId != null && isOperatorUnreadForCounters(messageData)) {
          socketIncrementDialogUnreadCount(Number(dialogId), 1, processingKey);
          incrementUnreadCount(newSessionId, 1);
        }

        setActiveSessionId(newSessionId);

        const fetchUserIdRaw =
          incomingUserIdRaw ?? messageData.dialog?.owner?.id ?? messageData?.createdBy?.id;
        if (fetchUserIdRaw != null && fetchUserIdRaw !== '' && !isElectronMainChatHost()) {
          fetchUserInfo(parseInt(String(fetchUserIdRaw), 10)).then((userData: any) => {
            if (userData) {
              updateSession(newSessionId, {
                selectedUsers: [userData.id],
                selectedUserName: getUserFullName(userData),
                usersCache: new Map([[userData.id, userData]]),
                hasLoadedDialogs: true,
              });

              if (messageData.messageStatus === 'TO_OPERATOR' && !dialogIdStr) {
                const dId = messageData.dialog?.id ?? dialogId;
                if (dId) {
                  dialogHandlers
                    .loadDialogHistory(newSessionId, String(dId), true, 0, true)
                    .catch(console.error);
                } else {
                  dialogHandlers
                    .refreshMessagesForUserId(newSessionId, userData.id)
                    .catch(console.error);
                }
              }
            }
          });
        }

        if (dialogId && !isElectronChatShell()) {
          updateSessionUnreadCount(newSessionId, String(dialogId));
        }

        if (
          messageData.uuid &&
          !refs.deliveredStatusesRef.current.has(messageData.uuid) &&
          messageData.messageStatus === 'TO_OPERATOR' &&
          messageData.confirmStatus === 'SENT'
        ) {
          setTimeout(() => {
            const currentSession = getSession(newSessionId);
            if (!currentSession) return;
            const dialogSt = currentSession.selectedDialog?.status;
            const incomingClosed = isChatDialogClosedStatus(messageData.dialog?.status);
            if (!dialogSt && !incomingClosed) return;
            const treatAsClosed = incomingClosed || isChatDialogClosedStatus(dialogSt);
            if (treatAsClosed && (!isChatOpen || currentSession.isMinimized)) {
              return;
            }
            const sendResult = statusHandlers.sendDeliveredStatusForNewMessage(
              newSessionId,
              messageData.uuid,
            );
            if (sendResult) {
              refs.deliveredStatusesRef.current.add(messageData.uuid);
            }
          }, 1000);
        }
      }
    },
    [
      getSession,
      updateSession,
      enhancedCreateNewSession,
      fetchUserInfo,
      getUserFullName,
      statusHandlers,
      dialogHandlers,
      messageHandlers,
      forceLoadUnreadDialogs,
      incrementUnreadCount,
      sendMessageStatus,
      setActiveSessionId,
      refreshAllOpenSessions,
      updateSessionUnreadCount,
      socketIncrementDialogUnreadCount,
      refs,
      isChatOpen,
    ],
  );

  useEffect(() => {
    const processIncomingMessage = async () => {
      const queued = flushIncomingChatMessages();
      for (const raw of queued) {
        let messageData = raw;
        if (
          messageData?.content &&
          Array.isArray(messageData.content) &&
          messageData.content.length > 0
        ) {
          messageData = messageData.content[0];
        }
        if (messageData) {
          const receipt = parseWsChatStatusReceipt(messageData);
          if (receipt) {
            handleStatusUpdate({ ...messageData, status: receipt.statusRaw });
            if (!receipt.looksLikeChatPayload) {
              continue;
            }
          }
          await handleIncomingMessage(messageData);
        }
      }

      if (!lastMessage) return;

      const lmDest = typeof lastMessage.destination === 'string' ? lastMessage.destination : '';
      const isWsChatLastMessage =
        lastMessage.type === '/user/queue/messages' ||
        lastMessage.type === 'OPERATOR_MESSAGE' ||
        lmDest.startsWith('/topic/operator/messages/');

      if (isWsChatLastMessage) {
        let messageData = lastMessage.data;
        if (
          messageData?.content &&
          Array.isArray(messageData.content) &&
          messageData.content.length > 0
        ) {
          messageData = messageData.content[0];
        }
        if (messageData) {
          const receipt = parseWsChatStatusReceipt(messageData);
          if (receipt) {
            handleStatusUpdate({ ...messageData, status: receipt.statusRaw });
          }
          if (queued.length === 0 && (!receipt || receipt.looksLikeChatPayload)) {
            await handleIncomingMessage(messageData);
          }
        }
        return;
      }

      if (
        lastMessage.type === 'STATUS_UPDATE' ||
        lastMessage.destination === '/user/queue/status'
      ) {
        handleStatusUpdate(lastMessage.data);
        return;
      }

      if (lastMessage.data?.uuidMessage && lastMessage.data?.status) {
        statusHandlers.handleDeliveryConfirm(
          lastMessage.data,
          sessions,
          updateSession,
          recalculateSessionUnreadCount,
        );
        return;
      }

      if (lastMessage.type === 'DIALOGS_UPDATE') {
        chatUnreadTrace('context.lastMessage DIALOGS_UPDATE — пропуск обработки счётчиков', {
          destination: lastMessage.destination,
          dataIsArray: Array.isArray(lastMessage.data),
          arrayLength: Array.isArray(lastMessage.data) ? lastMessage.data.length : undefined,
          note: 'Пер-dialog счётчики уже выставлены в SocketContext; ветки lastMessage /user/queue/unread и /queue/unread/{branch} ниже для этого типа не выполняются',
        });
        return;
      }

      if (lastMessage.type === 'error' || lastMessage.destination === '/user/queue/errors') {
        const errorData = lastMessage.data;
        if (
          handleChatBlockedByAdminResponse({
            status: errorData?.status ?? errorData?.statusCode ?? 409,
            detail: errorData?.detail ?? errorData?.message,
            message: errorData?.message ?? errorData?.detail,
            title: errorData?.title,
            path: errorData?.path ?? errorData?.instance,
          }) ||
          handleChatBlockedByAdminResponse(
            typeof lastMessage.rawBody === 'string' ? lastMessage.rawBody : undefined,
          )
        ) {
          return;
        }
        if (activeSessionId) {
          const sessionCreationTime = refs.sessionCreationTimeRef.current.get(activeSessionId);
          const currentTime = Date.now();
          if (sessionCreationTime && currentTime - sessionCreationTime < 2000) return;
        }

        const errorId = `${errorData.type}_${errorData.message}_${Date.now()}`;
        if (refs.processedErrorsRef.current.has(errorId)) return;
        refs.processedErrorsRef.current.add(errorId);
        setTimeout(() => refs.processedErrorsRef.current.delete(errorId), 5000);

        if (errorData.type === 'ACCESS_DENIED' && activeSessionId) {
          const session = getSession(activeSessionId);
          if (session) {
            const sessionErrorKey = `${activeSessionId}_ACCESS_DENIED`;
            const processingCount =
              refs.accessDeniedProcessingRef.current.get(sessionErrorKey) || 0;
            if (processingCount > 2) return;

            refs.accessDeniedProcessingRef.current.set(sessionErrorKey, processingCount + 1);
            setTimeout(() => refs.accessDeniedProcessingRef.current.delete(sessionErrorKey), 10000);

            const now = Date.now();
            const filteredMessages = session.messages.filter((msg: any) => {
              if (!msg.isPending) return true;
              if (msg.created_at) return now - new Date(msg.created_at).getTime() >= 500;
              return false;
            });

            updateSession(activeSessionId, {
              messages: filteredMessages,
              lastSendError: errorData.message || i18n.t('chat.needTakeToSendDefault'),
              assignedDialogId: null,
              selectedDialog: {
                ...session.selectedDialog,
                status: 'OPEN',
              },
            });
          }
        } else if (errorData.type === 'INTERNAL_ERROR' && activeSessionId) {
          const session = getSession(activeSessionId);
          if (session?.messages?.length > 0) {
            const filteredMessages = session.messages.filter((msg: any) => !msg.isPending);
            updateSession(activeSessionId, {
              messages: filteredMessages,
              lastSendError: errorData.message || i18n.t('chat.internalServerError'),
            });
          }
        }
        return;
      }

      if (
        lastMessage.type === 'DIALOG_STATUS_UPDATE' ||
        lastMessage.type?.includes('/topic/dialog/status/')
      ) {
        const statusEventKey = `evt:${String(lastMessage.destination || '')}:${String(
          lastMessage.rawBody || JSON.stringify(lastMessage.data || {}),
        )}`;
        if (refs.processedDialogStatusesRef.current.has(statusEventKey)) return;
        refs.processedDialogStatusesRef.current.add(statusEventKey);
        setTimeout(() => {
          refs.processedDialogStatusesRef.current.delete(statusEventKey);
        }, 500);

        const dialogStatusData = lastMessage.data;
        handleDialogStatusUpdate(dialogStatusData);
        return;
      }

      if (lastMessage.type === '/user/queue/unread') {
        chatUnreadTrace(
          'context.lastMessage /user/queue/unread (редко: Socket не ставит lastMessage)',
          {
            dataIsArray: Array.isArray(lastMessage.data),
          },
        );
        if (Array.isArray(lastMessage.data)) {
          updateUnreadCountsFromWebSocket(lastMessage.data);
        }

        refreshAllOpenSessions();

        if (activeSessionId) {
          const existingTimeout =
            refs.forceLoadUnreadDialogsDebounceRef.current.get(activeSessionId);
          if (existingTimeout) clearTimeout(existingTimeout);

          const newTimeout = setTimeout(() => {
            forceLoadUnreadDialogs(activeSessionId);
            refs.forceLoadUnreadDialogsDebounceRef.current.delete(activeSessionId);
          }, 1000);

          refs.forceLoadUnreadDialogsDebounceRef.current.set(activeSessionId, newTimeout);
        }
        return;
      }

      const currentBranchId = appStore.getState().selectedBranchState?.id;

      if (lastMessage.type === `/queue/unread/${currentBranchId}`) {
        chatUnreadTrace(
          'context.lastMessage /queue/unread/{branch} (редко: type сейчас DIALOGS_UPDATE)',
          {
            branchId: currentBranchId,
          },
        );
        if (Array.isArray(lastMessage.data) && lastMessage.data.length === 0) return;

        const now = Date.now();
        const lastUpdate = refs.lastUnreadUpdateRef.current;
        if (lastUpdate && now - lastUpdate < 5000) return;
        refs.lastUnreadUpdateRef.current = now;

        if (Array.isArray(lastMessage.data)) {
          updateUnreadCountsFromWebSocket(lastMessage.data);
        }

        refreshAllOpenSessions();

        if (activeSessionId) {
          const existingTimeout =
            refs.forceLoadUnreadDialogsDebounceRef.current.get(activeSessionId);
          if (existingTimeout) clearTimeout(existingTimeout);

          const newTimeout = setTimeout(() => {
            forceLoadUnreadDialogs(activeSessionId);
            refs.forceLoadUnreadDialogsDebounceRef.current.delete(activeSessionId);
          }, 1000);

          refs.forceLoadUnreadDialogsDebounceRef.current.set(activeSessionId, newTimeout);
        }

        if (Array.isArray(lastMessage.data)) {
          lastMessage.data.forEach((dialogData: any) => {
            if (dialogData.dialogId && dialogData.countUnMessages > 0) {
              sessions.forEach((session: any) => {
                if (
                  (session.selectedDialog?.id === dialogData.dialogId.toString() ||
                    session.assignedDialogId === dialogData.dialogId.toString()) &&
                  !session.isMinimized
                ) {
                  setTimeout(() => dialogHandlers.forceRefreshSessionMessages(session.id), 500);
                }
              });
            }
          });
        }
        return;
      }
    };

    processIncomingMessage();
  }, [
    lastMessage,
    sessions,
    activeSessionId,
    getSession,
    updateSession,
    enhancedCreateNewSession,
    fetchUserInfo,
    getUserFullName,
    forceLoadUnreadDialogs,
    statusHandlers,
    dialogHandlers,
    messageHandlers,
    sendMessageStatus,
    setActiveSessionId,
    refreshAllOpenSessions,
    updateUnreadCountsFromWebSocket,
    updateSessionUnreadCount,
    handleDialogStatusUpdate,
    handleStatusUpdate,
    handleIncomingMessage,
    flushIncomingChatMessages,
    refs,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/operator-chat-popup')) {
      return;
    }
    if (sessions.length > 1) removeDuplicateSessions();
  }, [sessions, removeDuplicateSessions]);

  useEffect(() => {
    if (isChatOpen && activeSessionId) {
      const session = getSession(activeSessionId);
      if (session?.messages?.length > 0 && !session.isMinimized) {
        if (!session.selectedDialog?.status) return;

        const timerId = setTimeout(() => {
          const pendingDeliveryMessages = session.messages.filter(
            (msg: any) =>
              msg.messageStatus === 'TO_OPERATOR' &&
              !msg.is_read &&
              String(msg.confirmStatus ?? '').toUpperCase() !== 'READ' &&
              (String(msg.confirmStatus ?? '').toUpperCase() === 'SENT' ||
                String(msg.confirmStatus ?? '').toUpperCase() === 'DELIVERED'),
          );

          if (pendingDeliveryMessages.length > 0) {
            statusHandlers.sendDeliveredStatusesForSession(activeSessionId);
          }
        }, 1000);

        return () => clearTimeout(timerId);
      }
    }
  }, [isChatOpen, activeSessionId, getSession, statusHandlers.sendDeliveredStatusesForSession]);

  useEffect(() => {
    if (activeSessionId) {
      removeEmptySessions(activeSessionId);
    } else {
      removeEmptySessions();
    }
  }, [sessions.length, activeSessionId, removeEmptySessions]);

  useEffect(() => {
    if (!socketDialogsUnreadCounts || socketDialogsUnreadCounts.size === 0) return;
    const currentSessions = sessionsRef.current;
    currentSessions.forEach((session) => {
      const dialogId = resolveSessionDialogIdForUnread(session);
      if (dialogId == null || !socketDialogsUnreadCounts.has(dialogId)) return;
      const count = socketDialogsUnreadCounts.get(dialogId)!;
      if (session.isMinimized && count < (session.unreadCount ?? 0)) {
        chatUnreadTrace('context.sync session.unreadCount skip (minimized, WS ниже локального)', {
          sessionId: session.id,
          dialogId,
          wsCount: count,
          prevSessionUnread: session.unreadCount ?? 0,
        });
        return;
      }
      if (count !== (session.unreadCount ?? 0)) {
        chatUnreadTrace('context.sync session.unreadCount из SocketContext map', {
          sessionId: session.id,
          dialogId,
          count,
          prevSessionUnread: session.unreadCount ?? 0,
        });
        updateSession(session.id, { unreadCount: count });
      }
    });
  }, [socketDialogsUnreadCounts, updateSession]);

  useEffect(() => {
    // Electron main: чат UI только в popup — не дергать countMessages здесь.
    if (isElectronMainChatHost()) return;
    if (isChatOpen && sessions.length > 0 && activeSessionId) {
      const session = getSession(activeSessionId);
      if (session && !session.isLoadingUnreadDialogs && session.unreadDialogs.length === 0) {
        forceLoadUnreadDialogs(activeSessionId);
      }
    }
  }, [isChatOpen, activeSessionId]);

  const openUnreadDialogWithStatus = useCallback(
    async (sessionId: string, dialog: any) => {
      const incomingId = dialog?.id != null ? String(dialog.id) : '';
      const s = incomingId ? getSession(sessionId) : undefined;

      const rawCur = s?.selectedDialog?.id ?? s?.assignedDialogId;
      const cur =
        rawCur != null &&
        String(rawCur).trim() !== '' &&
        String(rawCur) !== '0' &&
        String(rawCur) !== 'assigned'
          ? String(rawCur)
          : '';

      const hasUsers = (s?.selectedUsers?.length ?? 0) > 0;
      const hasOtherDialogOpen = Boolean(s && incomingId && cur && cur !== incomingId && hasUsers);

      const targetSessionId = sessionId;

      if (hasOtherDialogOpen) {
        const oldDialog = s.selectedDialog;
        const oldSessionData = { ...s };
        delete (oldSessionData as any).id;
        const minimizedSessionId = createNewSession({ asMinimized: true });
        updateSession(minimizedSessionId, {
          ...oldSessionData,
          selectedDialog: oldDialog,
          isMinimized: true,
          selectedUsers: s.selectedUsers || [],
          selectedUserName: s.selectedUserName || '',
          assignedDialogId: s.assignedDialogId ?? null,
          messages: s.messages || [],
          unreadCount: s.unreadCount ?? 0,
          unreadDialogs: s.unreadDialogs || [],
          hasLoadedDialogs: s.hasLoadedDialogs,
          usersCache: s.usersCache || new Map(),
          transferRecipientFullName: s.transferRecipientFullName || null,
          lastSendError: s.lastSendError,
        });
        updateSession(sessionId, {
          selectedDialog: dialog,
          unreadDialogs: (s.unreadDialogs || []).filter((d: any) => d.id !== dialog.id),
        });
      } else {
        updateSession(sessionId, {
          selectedDialog: dialog,
          unreadDialogs: (s?.unreadDialogs || []).filter((d: any) => d.id !== dialog.id),
        });
      }

      await dialogHandlers.openUnreadDialogWithStatus(targetSessionId, dialog, openUnreadDialog);

      const dialogId = dialog?.id != null ? String(dialog.id) : undefined;
      setTimeout(() => recalculateSessionUnreadCount(targetSessionId, dialogId), 400);
      if (targetSessionId !== sessionId) {
        setTimeout(() => recalculateSessionUnreadCount(sessionId, undefined), 400);
      }
    },
    [
      getSession,
      updateSession,
      createNewSession,
      dialogHandlers.openUnreadDialogWithStatus,
      openUnreadDialog,
      recalculateSessionUnreadCount,
    ],
  );

  const contextValue: ChatContextType = {
    sessions,
    activeSessionId,
    setActiveSessionId,
    sendMessage,
    isChatOpen,
    setIsChatOpen: handleSetIsChatOpen,
    clearMessages,
    createNewSession: enhancedCreateNewSession,
    closeSession,
    toggleSessionMinimize,
    expandSession,
    updateSession,
    getSession,
    findSessionByUserId,
    hasSessionWithUser,
    getSessionByUserId,
    removeDuplicateSessions,
    removeEmptySessions,
    uploadAttachments,
    refreshDialogs: safeRefreshDialogs,
    addPendingAttachments,
    setPendingAttachments,
    clearPendingAttachments,
    getPendingAttachments,
    assignDialog,
    loadUnreadDialogs,
    loadDialogDetails,
    openUnreadDialog: openUnreadDialogWithStatus,
    setDialogsUnreadCounts,
    forceLoadUnreadDialogs,
    sendDeliveredStatusesForSession: statusHandlers.sendDeliveredStatusesForSession,
    sendReadStatusesForSession: statusHandlers.sendReadStatusesForSession,
    sendDeliveredStatusForNewMessage: statusHandlers.sendDeliveredStatusForNewMessage,
    refreshUserMessages: dialogHandlers.refreshUserMessages,
    refreshUserMessagesAfterSend: dialogHandlers.refreshUserMessagesAfterSend,
    refreshSessionMessages: dialogHandlers.refreshSessionMessages,
    forceRefreshSessionMessages: dialogHandlers.forceRefreshSessionMessages,
    addMessageFromWebSocket: (sessionId: string, messageData: any) =>
      messageHandlers.addMessageFromWebSocket(sessionId, messageData),
    loadDialogHistory: dialogHandlers.loadDialogHistory,
    sendReadStatusForMessageId: statusHandlers.sendReadStatusForMessageId,
    loadMessagesByUserId: dialogHandlers.refreshMessagesForUserId,
    loadPreviousMessages: dialogHandlers.loadPreviousMessages,
    loadNextMessages: dialogHandlers.loadNextMessages,
    loadFirstPageMessages: dialogHandlers.loadFirstPageMessages,
    refreshDialogHistory: dialogHandlers.refreshDialogHistory,
    debouncedSyncDialogHistory: messageHandlers.debouncedSyncDialogHistory,
    navigateToQuotedMessage: dialogHandlers.navigateToQuotedMessage,
    addNewMessageToSession: dialogHandlers.addNewMessageToSession,
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
