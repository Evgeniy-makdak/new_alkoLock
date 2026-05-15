import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Close, Minimize, PushPin, PushPinOutlined } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { appStore } from '@shared/model/app_store/AppStore';

import api from '../api';
import { useChat } from '../contexts/ChatContext';
import { useSocket } from '../contexts/SocketContext';
import { operatorUnreadDebug } from '../lib/operatorUnreadDebugLog';
import styles from './ChatPanel.module.scss';
import { DialogActions } from './DialogActions';
import MessageFeed from './MessageFeed';
import MessageInput from './MessageInput';
import { TransferOperatorSelect } from './TransferOperatorSelect';
import UsersSelect from './UsersSelect';

interface ChatPanelProps {
  sessionId: string;
  onMinimize?: () => void;
  scrollToBottomOnExpand?: boolean;
  onScrollToBottomDone?: () => void;
  /** Десктоп: перетаскивание общего dock за область шапки (не кнопки). */
  dockDragEnabled?: boolean;
  onDockDragPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Закрепить положение и размер окна чата (только режим floating dock). */
  chatLayoutPinned?: boolean;
  onToggleChatLayoutPin?: () => void;
}

function getLastOperatorIdFromDialog(d: any): number | string | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const lo = d.lastOperator ?? d.last_operator ?? d.dialog?.lastOperator ?? d.dialog?.last_operator;
  return lo?.id;
}

/** Активный dialogId для ленты: мета сессии или fallback из сообщений (пока selectedDialog не проставлен). */
function resolveActiveFeedDialogIdStr(session: any): string | null {
  if (!session) return null;
  let sid =
    session.selectedDialog?.id && String(session.selectedDialog.id) !== '0'
      ? String(session.selectedDialog.id)
      : session.assignedDialogId &&
          String(session.assignedDialogId) !== '0' &&
          String(session.assignedDialogId) !== 'assigned'
        ? String(session.assignedDialogId)
        : null;
  if (sid == null && session.messages?.length) {
    const m = session.messages.find((x: any) => x.dialogId != null || x.dialog?.id != null);
    if (m) sid = String(m.dialogId ?? m.dialog?.id ?? '');
  }
  return sid && sid !== '' ? sid : null;
}

function ChatPanel({
  sessionId,
  onMinimize,
  scrollToBottomOnExpand,
  onScrollToBottomDone,
  dockDragEnabled = false,
  onDockDragPointerDown,
  chatLayoutPinned = false,
  onToggleChatLayoutPin,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { dialogsUnreadCounts, updateDialogUnreadCount } = useSocket();
  const {
    sessions,
    closeSession,
    setIsChatOpen,
    toggleSessionMinimize,
    updateSession,
    getSession,
    setActiveSessionId,
    findSessionByUserId,
    removeEmptySessions,
    clearPendingAttachments,
    setPendingAttachments,
    getPendingAttachments,
    sendReadStatusForMessageId,
    loadDialogHistory,
    loadMessagesByUserId,
  } = useChat();

  const session = getSession(sessionId);
  const resolvedFeedDialogIdStr = useMemo(() => resolveActiveFeedDialogIdStr(session), [session]);

  /** Без ссылки на массив messages в deps эффекта истории — иначе лишние прогоны при любом updateSession. */
  const messageBulkDialogKey = useMemo(() => {
    const msgs = session?.messages;
    if (!msgs?.length) return 'empty';
    const ids = new Set<string>();
    for (const m of msgs) {
      const id = String((m as any).dialogId ?? (m as any).dialog?.id ?? '');
      if (id) ids.add(id);
    }
    return `${msgs.length}:${Array.from(ids).sort().join(',')}`;
  }, [session?.messages]);

  /** Актуальный getSession без подписки useCallback на usersCache — иначе цикл запросов в UsersSelect. */
  const getSessionLiveRef = useRef(getSession);
  getSessionLiveRef.current = getSession;

  const [localIsUsersTouched, setLocalIsUsersTouched] = useState(false);
  const [localHasSentMessage, setLocalHasSentMessage] = useState(false);
  const [localClearMessageInput, setLocalClearMessageInput] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dialogStatus, setDialogStatus] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isDialogReallyBlocked, setIsDialogReallyBlocked] = useState(false);
  const [isTransferLoading, setIsTransferLoading] = useState(false);
  const [isCompleteButtonActive, setIsCompleteButtonActive] = useState(false);
  const [pendingTransferOperator, setPendingTransferOperator] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [transferSelectionResetTick, setTransferSelectionResetTick] = useState(0);
  const [localTransferBannerName, setLocalTransferBannerName] = useState<string | null>(null);
  const [isTransferBannerPinned, setIsTransferBannerPinned] = useState(false);

  const authId = appStore((state) => state.authId);

  const isUpdatingRef = useRef(false);
  const prevSessionIdRef = useRef<string>(sessionId);
  const lastMessageCountRef = useRef<number>(0);
  const lastStableUnreadCountRef = useRef<number>(0);
  const unreadCountDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const headerUnreadLogRef = useRef<number | null>(null);
  const prevIsMinimizedRef = useRef<boolean>(false);
  const initialLoadDoneRef = useRef(false);
  const historyLoadAttemptedRef = useRef(false);
  /** Смена выбранного диалога в той же сессии: сбрасываем guard, иначе лента «залипает» на старых сообщениях. */
  const prevSelectedDialogIdForHistoryRef = useRef<string | null>(null);
  const isSessionSwitchingRef = useRef(false);
  const observerPollSignatureRef = useRef<string>('');

  const getDisplayUserName = useCallback(() => {
    if (session?.selectedUserName) return session.selectedUserName;
    if (session?.selectedUsers?.length > 0) {
      const userId = session.selectedUsers[0];
      const cachedUser = session.usersCache?.get(userId);
      if (cachedUser?.fullName) return cachedUser.fullName;
    }
    return '';
  }, [session]);

  const stableSetUnreadCount = useCallback((newCount: number) => {
    if (unreadCountDebounceRef.current) clearTimeout(unreadCountDebounceRef.current);
    if (newCount !== lastStableUnreadCountRef.current) {
      lastStableUnreadCountRef.current = newCount;
      setUnreadCount(newCount);
    }
  }, []);

  useEffect(() => {
    if (!session || isUpdatingRef.current || isSessionSwitchingRef.current) return;

    isUpdatingRef.current = true;

    try {
      if (session.isUsersTouched !== localIsUsersTouched) {
        setLocalIsUsersTouched(session.isUsersTouched || false);
      }

      if (session.hasSentMessage !== localHasSentMessage) {
        setLocalHasSentMessage(session.hasSentMessage || false);
      }

      if (session.clearMessageInput !== localClearMessageInput) {
        setLocalClearMessageInput(session.clearMessageInput || false);
      }

      const pendingAttachments = getPendingAttachments(sessionId);
      const currentAttachmentsKey = attachments.map((f) => `${f.name}-${f.size}`).join(',');
      const pendingAttachmentsKey = pendingAttachments.map((f) => `${f.name}-${f.size}`).join(',');

      if (currentAttachmentsKey !== pendingAttachmentsKey) {
        setAttachments(pendingAttachments);
      }

      if (session.selectedDialog?.status && session.selectedDialog.status !== dialogStatus) {
        setDialogStatus(session.selectedDialog.status);
      }

      if (session.messages) {
        const activeSid = resolvedFeedDialogIdStr;
        const msgsForUnread =
          activeSid != null
            ? session.messages.filter(
                (msg: any) => String(msg.dialogId ?? msg.dialog?.id ?? '') === activeSid,
              )
            : [];

        const currentMessageCount = msgsForUnread.length;
        if (currentMessageCount !== lastMessageCountRef.current) {
          lastMessageCountRef.current = currentMessageCount;
        }

        const strictCount = msgsForUnread.reduce((acc: number, msg: any) => {
          if (String(msg.confirmStatus ?? '').toUpperCase() === 'READ') return acc;
          if (
            msg.messageStatus === 'TO_OPERATOR' &&
            (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
            !msg.is_read
          ) {
            return acc + 1;
          }
          return acc;
        }, 0);
        const relaxedCount = msgsForUnread.reduce((acc: number, msg: any) => {
          if (String(msg.confirmStatus ?? '').toUpperCase() === 'READ') return acc;
          if (msg.messageStatus === 'TO_OPERATOR' && !msg.is_read) {
            return acc + 1;
          }
          return acc;
        }, 0);
        const count = Math.max(strictCount, relaxedCount);

        stableSetUnreadCount(count);
        // Синхронизация в сессию сразу при вычислении для корректного превью при сворачивании
        if (count !== (session.unreadCount ?? 0)) {
          updateSession(sessionId, { unreadCount: count });
        }
      }
    } finally {
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [
    session,
    sessionId,
    resolvedFeedDialogIdStr,
    getPendingAttachments,
    attachments,
    dialogStatus,
    stableSetUnreadCount,
    updateSession,
  ]);

  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      prevSessionIdRef.current = sessionId;
      isUpdatingRef.current = false;
      lastMessageCountRef.current = 0;
      lastStableUnreadCountRef.current = 0;
      initialLoadDoneRef.current = false;
      historyLoadAttemptedRef.current = false;
      prevSelectedDialogIdForHistoryRef.current = null;
      isSessionSwitchingRef.current = false;
      prevIsMinimizedRef.current = false;
      observerPollSignatureRef.current = '';
    }
  }, [sessionId]);

  useEffect(() => {
    const raw = session?.selectedDialog?.id;
    const sid =
      raw != null && String(raw).trim() !== '' && String(raw) !== '0' ? String(raw) : null;
    if (prevSelectedDialogIdForHistoryRef.current !== sid) {
      prevSelectedDialogIdForHistoryRef.current = sid;
      historyLoadAttemptedRef.current = false;
    }
  }, [session?.selectedDialog?.id]);

  useEffect(() => {
    const wasMinimized = prevIsMinimizedRef.current;
    const isNowMinimized = !!session?.isMinimized;
    prevIsMinimizedRef.current = isNowMinimized;

    // После разворота из превью принудительно подтягиваем актуальные метаданные диалога
    // (lastOperator/status), чтобы не жить на потенциально устаревшем selectedDialog.
    if (!wasMinimized || isNowMinimized) return;

    const dialogId = session?.selectedDialog?.id;
    if (!dialogId || String(dialogId) === '0') return;

    api
      .getDialogById(String(dialogId))
      .then((dialogDetails: any) => {
        if (!dialogDetails || typeof dialogDetails !== 'object') return;
        const incomingLo = dialogDetails.lastOperator ?? dialogDetails.last_operator;
        const live = getSessionLiveRef.current(sessionId);
        if (!live?.selectedDialog) return;

        updateSession(sessionId, {
          selectedDialog: {
            ...live.selectedDialog,
            ...dialogDetails,
            ...(incomingLo != null ? { lastOperator: incomingLo } : {}),
          },
        });
      })
      .catch(console.error);
  }, [session?.isMinimized, session?.selectedDialog?.id, sessionId, updateSession]);

  useEffect(() => {
    return () => {
      if (unreadCountDebounceRef.current) clearTimeout(unreadCountDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (session) {
      const shouldUpdate =
        session.isUsersTouched !== localIsUsersTouched ||
        session.hasSentMessage !== localHasSentMessage ||
        session.clearMessageInput !== localClearMessageInput;

      if (shouldUpdate && !isUpdatingRef.current) {
        isUpdatingRef.current = true;
        updateSession(sessionId, {
          isUsersTouched: localIsUsersTouched,
          hasSentMessage: localHasSentMessage,
          clearMessageInput: localClearMessageInput,
        });

        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  }, [
    localIsUsersTouched,
    localHasSentMessage,
    localClearMessageInput,
    sessionId,
    updateSession,
    session,
  ]);

  useEffect(() => {
    if (session) {
      const pendingAttachments = getPendingAttachments(sessionId);
      const currentAttachmentNames = attachments.map((f) => f.name + f.size).join(',');
      const pendingAttachmentNames = pendingAttachments.map((f) => f.name + f.size).join(',');

      if (currentAttachmentNames !== pendingAttachmentNames) {
        setAttachments(pendingAttachments);
      }
    }
  }, [sessionId, getPendingAttachments, session, attachments]);

  useEffect(() => {
    if (localClearMessageInput) {
      setLocalClearMessageInput(false);
      updateSession(sessionId, { clearMessageInput: false });
    }
  }, [localClearMessageInput, sessionId, updateSession]);

  useEffect(() => {
    if (!session?.selectedDialog?.id || session.selectedDialog.id === '0' || session.isMinimized) {
      return;
    }
    const dialogId = String(session.selectedDialog.id);
    const msgs = session.messages || [];
    const hasMessageForDialog = msgs.some(
      (msg: any) => String(msg.dialogId ?? msg.dialog?.id ?? '') === dialogId,
    );

    /* В стейте осталась лента от другого диалога (смена сессии/диалога без очистки) — перезагружаем. */
    if (msgs.length > 0 && !hasMessageForDialog) {
      void loadDialogHistory(sessionId, dialogId, true).catch(console.error);
      return;
    }

    if (!historyLoadAttemptedRef.current && msgs.length === 0) {
      historyLoadAttemptedRef.current = true;
      void loadDialogHistory(sessionId, dialogId).catch(console.error);
    }
  }, [
    session?.selectedDialog?.id,
    messageBulkDialogKey,
    session?.isMinimized,
    sessionId,
    loadDialogHistory,
  ]);

  useEffect(() => {
    if (session?.selectedUsers && session.selectedUsers.length > 0 && !initialLoadDoneRef.current) {
      const userId = session.selectedUsers[0];
      const hasDialogId = session.selectedDialog?.id && session.selectedDialog.id !== '0';
      const isDialogClosed = session.selectedDialog?.status === 'CLOSED';
      const isDialogOpen =
        session.selectedDialog?.status === 'OPEN' ||
        session.selectedDialog?.status === 'ACTIVE' ||
        !session.selectedDialog?.status;

      if (hasDialogId && isDialogClosed) {
        loadDialogHistory(sessionId, session.selectedDialog.id).catch(console.error);
      } else if (isDialogOpen && !hasDialogId) {
        loadMessagesByUserId(sessionId, userId)
          .catch(console.error)
          .finally(() => undefined);
      }

      initialLoadDoneRef.current = true;
    }
  }, [
    session?.selectedUsers,
    session?.selectedDialog,
    sessionId,
    loadDialogHistory,
    loadMessagesByUserId,
  ]);

  useEffect(() => {
    if (!session?.selectedDialog?.id || session.selectedDialog.id === '0') return;

    const checkDialogStatusInterval = setInterval(() => {
      const liveSession = getSession(sessionId);
      if (!liveSession?.selectedDialog?.id || liveSession.selectedDialog.id === '0') return;
      const dialogId = String(liveSession.selectedDialog.id);

      api
        .getDialogById(dialogId)
        .then((dialogDetails: any) => {
          if (!dialogDetails || typeof dialogDetails !== 'object') return;
          const nextStatus = String(dialogDetails.status || '').toUpperCase();
          if (!nextStatus) return;
          const currentStatus = String(
            liveSession.selectedDialog?.status || dialogStatus || '',
          ).toUpperCase();
          if (nextStatus === currentStatus) return;

          setDialogStatus(nextStatus);
          const incomingLo = dialogDetails.lastOperator ?? dialogDetails.last_operator;
          updateSession(sessionId, {
            selectedDialog: {
              ...liveSession.selectedDialog,
              ...dialogDetails,
              status: nextStatus,
              ...(incomingLo != null ? { lastOperator: incomingLo } : {}),
              ...(nextStatus !== 'CLOSED' ? { lastOperator: null } : {}),
            },
            ...(nextStatus !== 'CLOSED'
              ? { assignedDialogId: null, lastSendError: null, transferRecipientFullName: null }
              : {}),
          });
        })
        .catch((error) => {
          console.error('Ошибка проверки статуса диалога:', error);
        });
    }, 10000);

    return () => clearInterval(checkDialogStatusInterval);
  }, [sessionId, getSession, updateSession, dialogStatus, session?.selectedDialog?.id]);

  useEffect(() => {
    if (!session || session.isMinimized) return;

    const selectedDialogId = session.selectedDialog?.id;
    const assignedDialogId = session.assignedDialogId;
    const dialogIdForRefresh =
      selectedDialogId != null && String(selectedDialogId) !== '0'
        ? String(selectedDialogId)
        : assignedDialogId != null &&
            String(assignedDialogId) !== '' &&
            String(assignedDialogId) !== '0' &&
            String(assignedDialogId) !== 'assigned'
          ? String(assignedDialogId)
          : '';
    if (!dialogIdForRefresh) return;

    const effectiveStatus = String(
      session.selectedDialog?.status || dialogStatus || '',
    ).toUpperCase();
    if (effectiveStatus !== 'CLOSED') return;

    const dialogLastOperatorId = getLastOperatorIdFromDialog(session.selectedDialog);
    const currentOperatorId = authId != null ? Number(authId) : NaN;
    const isObserverInClosedDialog =
      dialogLastOperatorId != null &&
      Number.isFinite(currentOperatorId) &&
      Number(dialogLastOperatorId) !== currentOperatorId;
    if (!isObserverInClosedDialog) return;

    const refreshInterval = setInterval(() => {
      Promise.all([
        api.getDialogMessagesWithPagination(dialogIdForRefresh, 0, 50, 'createdAt,desc'),
        api.getDialogById(dialogIdForRefresh),
      ])
        .then(([pollResponse, dialogMeta]: [any, any]) => {
          const live = getSession(sessionId);
          const currentStatus = String(
            live?.selectedDialog?.status ?? session?.selectedDialog?.status ?? dialogStatus ?? '',
          ).toUpperCase();
          const nextStatus = String(
            dialogMeta?.status ?? pollResponse?.content?.[0]?.dialog?.status ?? currentStatus,
          ).toUpperCase();
          const nextLastOperator = dialogMeta?.lastOperator ?? dialogMeta?.last_operator;

          if (nextStatus !== '' && nextStatus !== currentStatus) {
            setDialogStatus(nextStatus);
            updateSession(sessionId, {
              selectedDialog: {
                ...(live?.selectedDialog || {}),
                ...(dialogMeta && typeof dialogMeta === 'object' ? dialogMeta : {}),
                status: nextStatus,
                ...(nextStatus !== 'CLOSED' ? { lastOperator: null } : {}),
                ...(nextStatus === 'CLOSED' && nextLastOperator != null
                  ? { lastOperator: nextLastOperator }
                  : {}),
              },
              ...(nextStatus !== 'CLOSED'
                ? { assignedDialogId: null, transferRecipientFullName: null, lastSendError: null }
                : {}),
            });
          }

          const totalElements = Number(pollResponse?.totalElements ?? 0);
          const content = Array.isArray(pollResponse?.content) ? pollResponse.content : [];
          const unreadDelivered = content.reduce((acc: number, msg: any) => {
            const isToOperator = String(msg?.messageStatus ?? '').toUpperCase() === 'TO_OPERATOR';
            const notRead =
              String(msg?.confirmStatus ?? '').toUpperCase() !== 'READ' && !msg?.is_read;
            const delivered = String(msg?.confirmStatus ?? '').toUpperCase() === 'DELIVERED';
            return isToOperator && notRead && delivered ? acc + 1 : acc;
          }, 0);
          const unreadSent = content.reduce((acc: number, msg: any) => {
            const isToOperator = String(msg?.messageStatus ?? '').toUpperCase() === 'TO_OPERATOR';
            const notRead =
              String(msg?.confirmStatus ?? '').toUpperCase() !== 'READ' && !msg?.is_read;
            const sent = String(msg?.confirmStatus ?? '').toUpperCase() === 'SENT';
            return isToOperator && notRead && sent ? acc + 1 : acc;
          }, 0);
          const unreadTotal = unreadDelivered + unreadSent;
          const nextSignature = [
            dialogIdForRefresh,
            totalElements,
            nextStatus,
            unreadTotal,
            unreadDelivered,
            unreadSent,
            nextLastOperator?.id ?? 'no-lo',
          ].join('|');

          if (observerPollSignatureRef.current === nextSignature) {
            return;
          }
          observerPollSignatureRef.current = nextSignature;
          loadDialogHistory(sessionId, dialogIdForRefresh).catch(console.error);
        })
        .catch(console.error);
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [session, sessionId, authId, dialogStatus, loadDialogHistory, getSession, updateSession]);

  const handleUsersChange = useCallback(
    (users: number[]) => {
      const filteredUsers = users.filter((id) => id !== 0);

      if (filteredUsers.length === 0) {
        updateSession(sessionId, {
          selectedUsers: [],
          selectedUserName: '',
          selectedDialog: null,
          assignedDialogId: null,
          hasLoadedDialogs: false,
          clearMessageInput: true,
          messages: [],
          hasSentMessage: false,
          isDialogEnded: false,
          transferRecipientFullName: null,
          pagination: {
            currentPage: 0,
            totalPages: 0,
            totalElements: 0,
            isLoadingMore: false,
            isLoadingNext: false,
            hasMoreMessages: false,
            hasNextMessages: false,
          },
        });
        setLocalClearMessageInput(true);
        setLocalHasSentMessage(false);
        setAttachments([]);
        clearPendingAttachments(sessionId);
        setDialogStatus('');
        stableSetUnreadCount(0);
        initialLoadDoneRef.current = false;
        historyLoadAttemptedRef.current = false;
      } else {
        /* Иначе остаётся selectedDialog/assignedDialogId от предыдущего пользователя:
         loadMessagesByUserId уходит в refreshSessionMessages(старый dialogId), запросов по новому userId нет,
         а эффект ниже не вызывает loadMessagesByUserId из‑за hasDialogId. */
        updateSession(sessionId, {
          selectedUsers: filteredUsers,
          selectedDialog: null,
          assignedDialogId: null,
          messages: [],
          hasHistoryLoaded: false,
          hasSentMessage: false,
          isDialogEnded: false,
          hasLoadedDialogs: false,
          lastSendError: null,
          transferRecipientFullName: null,
          pagination: {
            currentPage: 0,
            totalPages: 0,
            totalElements: 0,
            isLoadingMore: false,
            isLoadingNext: false,
            hasMoreMessages: false,
            hasNextMessages: false,
          },
        });
        initialLoadDoneRef.current = false;
        historyLoadAttemptedRef.current = false;
      }
    },
    [sessionId, updateSession, clearPendingAttachments, stableSetUnreadCount],
  );

  const handleUsersBlur = useCallback(() => {
    setLocalIsUsersTouched(true);
  }, []);

  const handleEndDialog = useCallback(() => {
    updateSession(sessionId, { isDialogEnded: true });
  }, [sessionId, updateSession]);

  const handleCheckExistingSession = useCallback(
    (userId: number): boolean => {
      const existingSession = findSessionByUserId(userId);

      if (existingSession && existingSession.id !== sessionId) {
        const existingDialogId =
          existingSession.selectedDialog?.id &&
          String(existingSession.selectedDialog.id) !== '0' &&
          String(existingSession.selectedDialog.id) !== 'assigned'
            ? String(existingSession.selectedDialog.id)
            : existingSession.assignedDialogId &&
                String(existingSession.assignedDialogId) !== '0' &&
                String(existingSession.assignedDialogId) !== 'assigned'
              ? String(existingSession.assignedDialogId)
              : '';
        const hasClosedHint =
          String(existingSession.selectedDialog?.status || '').toUpperCase() === 'CLOSED' ||
          !!existingSession.unreadDialogs?.some(
            (d: any) =>
              String(d?.id) === String(existingDialogId) &&
              String(d?.status || '').toUpperCase() === 'CLOSED',
          );

        if (existingDialogId && hasClosedHint) {
          updateSession(existingSession.id, {
            selectedDialog: {
              ...(existingSession.selectedDialog || {}),
              id: existingDialogId,
              status: 'CLOSED',
            },
            assignedDialogId: existingDialogId,
          });
        }
        setActiveSessionId(existingSession.id);
        isSessionSwitchingRef.current = true;

        if (existingSession.isMinimized) {
          // Разворачиваем найденную свёрнутую сессию выбранного пользователя.
          toggleSessionMinimize(existingSession.id);
        } else {
          toggleSessionMinimize(sessionId);
        }

        setTimeout(() => {
          isSessionSwitchingRef.current = false;
        }, 100);

        // При раскрытии через выпадающий список иногда остаётся устаревший статус в сессии.
        // Точечно синхронизируем метаданные диалога, чтобы UI не рендерил неверную кнопку.
        if (existingDialogId) {
          void api
            .getDialogById(existingDialogId)
            .then((freshDialog: any) => {
              if (!freshDialog || typeof freshDialog !== 'object') return;
              const incomingLo = freshDialog.lastOperator ?? freshDialog.last_operator;
              updateSession(existingSession.id, {
                selectedDialog: {
                  ...(existingSession.selectedDialog || {}),
                  ...freshDialog,
                  ...(incomingLo != null ? { lastOperator: incomingLo } : {}),
                },
                assignedDialogId: existingDialogId,
              });
            })
            .catch((_error: unknown): void => {});
        }

        return true;
      }
      return false;
    },
    [
      sessionId,
      findSessionByUserId,
      toggleSessionMinimize,
      setActiveSessionId,
      removeEmptySessions,
    ],
  );

  const handleUserSelect = useCallback(
    (userId: number, userName: string, userData?: any) => {
      // userId === 0 означает "снятие выбора" — handleUsersChange уже очистил сессию, не перезаписывать
      if (userId === 0) return;

      updateSession(sessionId, {
        selectedUsers: [userId],
        selectedUserName: userName,
      });

      if (userData) {
        const newCache = new Map(session?.usersCache || new Map());
        newCache.set(userId, userData);
        updateSession(sessionId, { usersCache: newCache });
      }

      initialLoadDoneRef.current = false;
      historyLoadAttemptedRef.current = false;
    },
    [sessionId, updateSession, session?.usersCache],
  );

  const handleMinimize = useCallback(() => {
    if (onMinimize) {
      onMinimize();
    } else if (session?.selectedDialog?.id) {
      toggleSessionMinimize(sessionId);
      setActiveSessionId(null);
    } else {
      closeSession(sessionId);
    }
  }, [
    session?.selectedDialog?.id,
    sessionId,
    toggleSessionMinimize,
    onMinimize,
    setActiveSessionId,
    closeSession,
  ]);

  const handleCloseAllChats = useCallback(() => {
    sessions.forEach((s) => {
      closeSession(s.id);
    });
    setIsChatOpen(false);
  }, [sessions, closeSession, setIsChatOpen]);

  const handleDockHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dockDragEnabled || !onDockDragPointerDown) return;
      const el = e.target as HTMLElement;
      if (el.closest('button')) return;
      onDockDragPointerDown(e);
    },
    [dockDragEnabled, onDockDragPointerDown],
  );

  const updateUsersCache = useCallback(
    (users: any[]) => {
      const current = getSessionLiveRef.current(sessionId);
      const newCache = new Map(current?.usersCache || new Map());
      users.forEach((user) => {
        if (user && user.id) newCache.set(user.id, user);
      });
      updateSession(sessionId, { usersCache: newCache });
    },
    [sessionId, updateSession],
  );

  const handleMessageTextChange = useCallback(
    (text: string) => {
      updateSession(sessionId, { messageText: text });
    },
    [sessionId, updateSession],
  );

  const handleMessageSent = useCallback(() => {
    setLocalHasSentMessage(true);
    updateSession(sessionId, {
      hasSentMessage: true,
      messageText: '',
    });
    setReplyTarget(null);
    setAttachments([]);
    clearPendingAttachments(sessionId);
  }, [sessionId, updateSession, clearPendingAttachments]);

  const handleReplyToMessage = useCallback((message: any) => {
    setReplyTarget(message);
  }, []);

  const handleClearReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const updatedMessages = (session?.messages || []).map((msg: any) =>
          msg.id === messageId ? { ...msg, isDeleted: true } : msg,
        );
        updateSession(sessionId, { messages: updatedMessages });
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    },
    [sessionId, session?.messages, updateSession],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newText: string) => {
      try {
        const updatedMessages = (session?.messages || []).map((msg: any) =>
          msg.id === messageId
            ? {
                ...msg,
                text: newText,
                edited_at: new Date().toISOString(),
              }
            : msg,
        );
        updateSession(sessionId, { messages: updatedMessages });
      } catch (error) {
        console.error('Error editing message:', error);
      }
    },
    [sessionId, session?.messages, updateSession],
  );

  const handleAttachmentsChange = useCallback(
    (files: File[]) => {
      setAttachments(files);
      setPendingAttachments(sessionId, files);
    },
    [sessionId, setPendingAttachments],
  );

  const handleRemoveAttachment = useCallback(
    (index: number) => {
      const newAttachments = [...attachments];
      newAttachments.splice(index, 1);
      setAttachments(newAttachments);
      setPendingAttachments(sessionId, newAttachments);
    },
    [sessionId, attachments, setPendingAttachments],
  );

  const updateDialogStatus = useCallback(
    (status: string) => {
      setDialogStatus(status);
      const liveSession = getSessionLiveRef.current(sessionId);
      if (liveSession?.selectedDialog) {
        updateSession(sessionId, {
          ...(status === 'OPEN' ? { transferRecipientFullName: null } : {}),
          selectedDialog: {
            ...liveSession.selectedDialog,
            status: status,
          },
        });
      }
    },
    [sessionId, updateSession],
  );

  const handleTransferToOperator = useCallback(
    async (targetOperatorId: number, pickedLabel: string) => {
      const live = getSession(sessionId);
      if (!live || isTransferLoading) return;

      const sel = live.selectedDialog;
      const rawDialogId = sel?.id;
      const assigned = live.assignedDialogId;
      const effectiveDialogId =
        rawDialogId != null && String(rawDialogId) !== '0'
          ? String(rawDialogId)
          : assigned != null &&
              String(assigned) !== '' &&
              String(assigned) !== '0' &&
              String(assigned) !== 'assigned'
            ? String(assigned)
            : '';

      const uid = authId != null ? Number(authId) : NaN;
      if (
        !effectiveDialogId ||
        effectiveDialogId === '0' ||
        targetOperatorId === uid ||
        !Number.isFinite(uid) ||
        targetOperatorId <= 0
      ) {
        return;
      }

      const effectiveStatus = String(sel?.status || dialogStatus || '').trim();
      if (effectiveStatus !== 'CLOSED') return;

      let lastOpId = getLastOperatorIdFromDialog(sel);
      if (lastOpId == null) {
        try {
          const freshDialog = await api.getDialogById(effectiveDialogId);
          const freshLastOpId = getLastOperatorIdFromDialog(freshDialog);
          if (freshDialog && typeof freshDialog === 'object') {
            const incomingLo =
              (freshDialog as any).lastOperator ?? (freshDialog as any).last_operator;
            updateSession(sessionId, {
              selectedDialog: {
                ...(live.selectedDialog || {}),
                ...(freshDialog as any),
                ...(incomingLo != null ? { lastOperator: incomingLo } : {}),
              },
              assignedDialogId: effectiveDialogId,
            });
          }
          if (freshLastOpId != null) {
            lastOpId = freshLastOpId;
          }
        } catch {
          // no-op: при первом клике допускаем fallback по isCompleteButtonActive.
        }
      }
      if (lastOpId != null && Number(lastOpId) !== uid && !isCompleteButtonActive) return;

      setIsTransferLoading(true);
      // Показываем баннер сразу по клику "Передать диалог",
      // чтобы не зависеть от задержек/рассинхрона внешних обновлений сессии.
      setLocalTransferBannerName(pickedLabel || null);
      setIsTransferBannerPinned(true);
      try {
        const statusForTransfer = effectiveStatus || 'ACTIVE';
        const updated = await api.transferDialog(
          effectiveDialogId,
          targetOperatorId,
          statusForTransfer,
        );

        const sessionNow = getSession(sessionId);
        const baseDialog = sessionNow?.selectedDialog || {};
        const mergedDialog =
          updated && typeof updated === 'object'
            ? {
                ...baseDialog,
                ...updated,
                // После передачи диалог остаётся закрытым, но уже с новым владельцем.
                status: 'CLOSED',
                lastOperator: (updated as any).lastOperator ??
                  (updated as any).dialog?.lastOperator ?? { id: targetOperatorId },
              }
            : {
                ...baseDialog,
                status: 'CLOSED',
                lastOperator: { id: targetOperatorId },
              };

        const lo = mergedDialog.lastOperator as
          | { fullName?: string; firstName?: string; surname?: string }
          | undefined;
        const recipientName =
          lo?.fullName || [lo?.firstName, lo?.surname].filter(Boolean).join(' ') || pickedLabel;

        updateSession(sessionId, {
          selectedDialog: mergedDialog as any,
          assignedDialogId: mergedDialog.id != null ? String(mergedDialog.id) : effectiveDialogId,
          hasLoadedDialogs: true,
          lastSendError: null,
          transferRecipientFullName: recipientName || null,
        });
        setLocalTransferBannerName(recipientName || null);
        // Сразу фиксируем локальный статус, чтобы UI не "откатывался" в режим "Забрать".
        setDialogStatus('CLOSED');
        setIsDialogReallyBlocked(true);
        setPendingTransferOperator(null);
        setTransferSelectionResetTick((tick) => tick + 1);
      } catch (error) {
        setLocalTransferBannerName(null);
        setIsTransferBannerPinned(false);
        console.error('Ошибка передачи диалога:', error);
      } finally {
        setIsTransferLoading(false);
      }
    },
    [
      isTransferLoading,
      authId,
      sessionId,
      getSession,
      updateSession,
      dialogStatus,
      isCompleteButtonActive,
    ],
  );

  const handleMarkMessagesAsRead = useCallback(
    (messageIds: string[]) => {
      if (messageIds.length > 0) {
        const liveSession = getSession(sessionId);
        const liveDialog = liveSession?.selectedDialog;
        const liveDialogStatus = String(liveDialog?.status || dialogStatus || '').toUpperCase();
        const liveLastOperatorId = getLastOperatorIdFromDialog(liveDialog);
        const currentOperatorId = authId != null ? Number(authId) : NaN;
        const canSendReadByOwnerRule =
          liveDialogStatus === 'CLOSED' &&
          liveLastOperatorId != null &&
          Number.isFinite(currentOperatorId) &&
          Number(liveLastOperatorId) === currentOperatorId;

        if (!canSendReadByOwnerRule) {
          operatorUnreadDebug('READ skipped: current operator is not dialog owner', {
            sessionId,
            dialogId: liveDialog?.id ?? liveSession?.assignedDialogId ?? null,
            dialogStatus: liveDialogStatus || null,
            lastOperatorId: liveLastOperatorId ?? null,
            currentOperatorId: Number.isFinite(currentOperatorId) ? currentOperatorId : null,
            messageIds,
          });
          return;
        }

        operatorUnreadDebug('READ на бэк + локальное обновление ленты', {
          sessionId,
          messageIds,
        });
        messageIds.forEach((messageId) => {
          sendReadStatusForMessageId(sessionId, messageId);
        });

        const idSet = new Set(messageIds);
        const updatedMessages = (liveSession?.messages || []).map((msg: any) =>
          idSet.has(String(msg.id)) || idSet.has(String(msg.uuid))
            ? { ...msg, is_read: true, confirmStatus: 'READ' }
            : msg,
        );
        updateSession(sessionId, { messages: updatedMessages });

        const activeDialogId =
          liveSession?.selectedDialog?.id && String(liveSession.selectedDialog.id) !== '0'
            ? String(liveSession.selectedDialog.id)
            : liveSession?.assignedDialogId &&
                String(liveSession.assignedDialogId) !== '' &&
                String(liveSession.assignedDialogId) !== '0' &&
                String(liveSession.assignedDialogId) !== 'assigned'
              ? String(liveSession.assignedDialogId)
              : null;
        if (activeDialogId) {
          const nextUnread = updatedMessages.reduce((acc: number, msg: any) => {
            if (String(msg.dialogId ?? msg.dialog?.id ?? '') !== activeDialogId) return acc;
            if (msg.messageStatus !== 'TO_OPERATOR') return acc;
            if (msg.is_read) return acc;
            if (String(msg.confirmStatus ?? '').toUpperCase() === 'READ') return acc;
            return acc + 1;
          }, 0);
          stableSetUnreadCount(nextUnread);
          updateSession(sessionId, { unreadCount: nextUnread });
          const activeDialogNumericId = Number(activeDialogId);
          if (Number.isFinite(activeDialogNumericId)) {
            // Локально отправили READ: сразу синхронизируем per-dialog счётчик в socket-карте,
            // чтобы исключить редкий "залипший +1" до прихода следующего WS-кадра.
            updateDialogUnreadCount(activeDialogNumericId, nextUnread);
          }
        }
      }
    },
    [
      sessionId,
      authId,
      dialogStatus,
      sendReadStatusForMessageId,
      getSession,
      updateSession,
      stableSetUnreadCount,
      updateDialogUnreadCount,
    ],
  );

  const activeDialogNumericId = useMemo(() => {
    if (!resolvedFeedDialogIdStr) return NaN;
    const n = Number(resolvedFeedDialogIdStr);
    return Number.isFinite(n) ? n : NaN;
  }, [resolvedFeedDialogIdStr]);

  const feedUnreadFromMessages = useMemo(() => {
    if (!session?.messages?.length || !resolvedFeedDialogIdStr) return 0;
    const activeSid = resolvedFeedDialogIdStr;
    const msgs = session.messages.filter(
      (msg: any) => String(msg.dialogId ?? msg.dialog?.id ?? '') === activeSid,
    );
    const strict = msgs.reduce((acc: number, msg: any) => {
      if (String(msg.confirmStatus ?? '').toUpperCase() === 'READ') return acc;
      if (
        msg.messageStatus === 'TO_OPERATOR' &&
        (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
        !msg.is_read
      ) {
        return acc + 1;
      }
      return acc;
    }, 0);
    const relaxed = msgs.reduce((acc: number, msg: any) => {
      if (String(msg.confirmStatus ?? '').toUpperCase() === 'READ') return acc;
      if (msg.messageStatus === 'TO_OPERATOR' && !msg.is_read) return acc + 1;
      return acc;
    }, 0);
    return Math.max(strict, relaxed);
  }, [session, resolvedFeedDialogIdStr]);

  const socketEntry = Number.isFinite(activeDialogNumericId)
    ? dialogsUnreadCounts.get(activeDialogNumericId)
    : undefined;

  useEffect(() => {
    if (!session) return;
    if (!Number.isFinite(activeDialogNumericId)) return;

    const effectiveStatus = String(
      session.selectedDialog?.status || dialogStatus || '',
    ).toUpperCase();
    if (effectiveStatus !== 'CLOSED') return;

    const lastOperatorId = getLastOperatorIdFromDialog(session.selectedDialog);
    const currentOperatorId = authId != null ? Number(authId) : NaN;
    const isClosedObserverMode =
      lastOperatorId != null &&
      Number.isFinite(currentOperatorId) &&
      Number(lastOperatorId) !== currentOperatorId;
    if (!isClosedObserverMode) return;

    const nextUnreadFromFeed = feedUnreadFromMessages;
    const currentUnreadInSocketMap = dialogsUnreadCounts.get(activeDialogNumericId);
    if (currentUnreadInSocketMap === nextUnreadFromFeed) return;

    updateDialogUnreadCount(activeDialogNumericId, nextUnreadFromFeed);
  }, [
    session,
    authId,
    dialogStatus,
    activeDialogNumericId,
    feedUnreadFromMessages,
    dialogsUnreadCounts,
    updateDialogUnreadCount,
  ]);

  const displayUnreadCount = session
    ? Math.max(unreadCount, session.unreadCount ?? 0, socketEntry ?? 0, feedUnreadFromMessages)
    : 0;

  useEffect(() => {
    if (!session) return;
    if (headerUnreadLogRef.current === displayUnreadCount) return;
    headerUnreadLogRef.current = displayUnreadCount;
    operatorUnreadDebug('Шапка открытого чата: бейдж непрочитанных', {
      sessionId,
      dialogId: Number.isFinite(activeDialogNumericId) ? activeDialogNumericId : null,
      показываем: displayUnreadCount,
      локальныйСтейтПанели: unreadCount,
      sessionUnreadCount: session.unreadCount,
      wsКартаПоДиалогу: socketEntry ?? null,
      подсчётПоСообщениям: feedUnreadFromMessages,
    });
  }, [
    session,
    sessionId,
    displayUnreadCount,
    unreadCount,
    socketEntry,
    feedUnreadFromMessages,
    activeDialogNumericId,
  ]);

  if (!session) return null;

  const {
    selectedDialog,
    messages,
    isMinimized,
    selectedUsers,
    selectedUserName,
    messageText,
    usersCache,
    isDialogEnded,
    isSendingMessage,
    lastSendError,
    assignedDialogId,
    transferRecipientFullName = null,
  } = session;

  // Скролл к первому непрочитанному в MessageFeed: флаг scrollToBottomOnExpand.
  // ChatFooter передаёт true только когда панель только что развернули из минимизации;
  // в остальных случаях автоскролл по новым входящим не должен запускаться.
  const shouldScrollToFirstUnreadOnExpand = useMemo(() => {
    return Boolean(scrollToBottomOnExpand);
  }, [scrollToBottomOnExpand]);

  useEffect(() => {
    operatorUnreadDebug('ChatPanel → MessageFeed: флаг скролла к непрочитанным', {
      sessionId,
      shouldScrollToFirstUnreadOnExpand,
      displayUnreadCount,
      пропОтChatFooter: scrollToBottomOnExpand,
    });
  }, [sessionId, shouldScrollToFirstUnreadOnExpand, displayUnreadCount, scrollToBottomOnExpand]);

  if (isMinimized) {
    return (
      <div className={styles.minimizedPanel}>
        <div className={styles.minimizedHeader} onClick={() => toggleSessionMinimize(sessionId)}>
          <h3>
            {selectedUserName || selectedDialog?.client_name || t('chat.dialogTitleFallback')}
          </h3>
          {displayUnreadCount > 0 && (
            <span className={styles.unreadBadgeMinimized}>
              {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
            </span>
          )}
          <IconButton
            title={t('chat.minimizeDialog')}
            onClick={(e) => {
              e.stopPropagation();
              toggleSessionMinimize(sessionId);
            }}>
            <Minimize />
          </IconButton>
        </div>
      </div>
    );
  }

  const hasExistingDialog =
    (selectedDialog?.id != null && String(selectedDialog.id) !== '0') ||
    (assignedDialogId != null &&
      String(assignedDialogId) !== '' &&
      String(assignedDialogId) !== '0' &&
      String(assignedDialogId) !== 'assigned');

  /** id диалога для действий (в т.ч. transfer), если в selectedDialog ещё не проставлен */
  const resolvedDialogIdForActions =
    selectedDialog?.id != null && String(selectedDialog.id) !== '0'
      ? String(selectedDialog.id)
      : assignedDialogId != null &&
          String(assignedDialogId) !== '' &&
          String(assignedDialogId) !== 'assigned'
        ? String(assignedDialogId)
        : '0';

  const dialogStatusEffective = String(selectedDialog?.status || dialogStatus || '');
  const lastOpIdForTransfer = getLastOperatorIdFromDialog(selectedDialog);
  const uidNum = authId != null ? Number(authId) : NaN;
  const hasForeignOwnerInClosedState =
    dialogStatusEffective === 'CLOSED' &&
    lastOpIdForTransfer != null &&
    Number.isFinite(uidNum) &&
    Number(lastOpIdForTransfer) !== uidNum;
  const canTransferDialog =
    isCompleteButtonActive ||
    (selectedUsers.length > 0 &&
      !!hasExistingDialog &&
      dialogStatusEffective === 'CLOSED' &&
      lastOpIdForTransfer != null &&
      Number.isFinite(uidNum) &&
      Number(lastOpIdForTransfer) === uidNum);

  useEffect(() => {
    if (!canTransferDialog) {
      setPendingTransferOperator((prev) => {
        if (prev) {
          setTransferSelectionResetTick((tick) => tick + 1);
        }
        return null;
      });
    }
  }, [canTransferDialog, resolvedDialogIdForActions, selectedUsers]);

  const showTransferSection =
    selectedUsers.length > 0 &&
    (isCompleteButtonActive ||
      (resolvedDialogIdForActions !== '0' && dialogStatusEffective === 'CLOSED'));
  const effectiveBlockedByOtherOperator =
    (isDialogReallyBlocked || hasForeignOwnerInClosedState) && !canTransferDialog;
  const shouldLockUsersSelect =
    dialogStatusEffective === 'ACTIVE' ||
    dialogStatusEffective === 'CLOSED' ||
    effectiveBlockedByOtherOperator ||
    (!!transferRecipientFullName && !canTransferDialog);

  const blockingOperatorLo =
    selectedDialog?.lastOperator ??
    selectedDialog?.dialog?.lastOperator ??
    selectedDialog?.last_operator;
  const blockingOperatorDisplay =
    blockingOperatorLo &&
    (blockingOperatorLo.fullName ||
      [blockingOperatorLo.firstName, blockingOperatorLo.surname].filter(Boolean).join(' ').trim() ||
      (blockingOperatorLo.id != null ? t('chat.userWithId', { id: blockingOperatorLo.id }) : ''));
  const transferRecipientDisplayName = transferRecipientFullName || localTransferBannerName || null;
  const shouldShowTransferBanner =
    dialogStatusEffective === 'CLOSED' && !!transferRecipientDisplayName;

  useEffect(() => {
    if (dialogStatusEffective !== 'CLOSED') {
      setIsDialogReallyBlocked(false);
    }
  }, [dialogStatusEffective]);

  useEffect(() => {
    // Сбрасываем локальный баннер только при реальной смене контекста окна
    // (другой пользователь/диалог), а не при промежуточных статусных гонках.
    setLocalTransferBannerName(null);
  }, [sessionId, resolvedDialogIdForActions, selectedUsers[0]]);

  useEffect(() => {
    // После успешного transfer держим pin, пока не подтвердится "чужой" CLOSED
    // (или не придёт transferRecipientFullName), чтобы не было мигания баннера.
    if (
      isTransferBannerPinned &&
      dialogStatusEffective === 'CLOSED' &&
      (hasForeignOwnerInClosedState || transferRecipientFullName)
    ) {
      setIsTransferBannerPinned(false);
    }
  }, [
    isTransferBannerPinned,
    dialogStatusEffective,
    hasForeignOwnerInClosedState,
    transferRecipientFullName,
  ]);

  useEffect(() => {
    // Баннер живёт только в состоянии "передан другому оператору".
    // Сбрасываем его только когда диалог выходит из CLOSED.
    if (!isTransferBannerPinned && dialogStatusEffective !== 'CLOSED') {
      setLocalTransferBannerName(null);
    }
  }, [dialogStatusEffective, isTransferBannerPinned]);

  return (
    <div className={styles.panel} data-session-id={sessionId}>
      <div
        className={`${styles.chatHeader} ${dockDragEnabled ? styles.chatHeaderDraggable : ''}`}
        onPointerDown={handleDockHeaderPointerDown}>
        <h3>{selectedUserName || selectedDialog?.client_name || t('chat.dialogTitleFallback')}</h3>
        {displayUnreadCount > 0 && (
          <span className={styles.unreadBadge}>
            {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
          </span>
        )}
        <div className={styles.headerActions}>
          {onToggleChatLayoutPin ? (
            <IconButton
              size="small"
              onClick={onToggleChatLayoutPin}
              title={chatLayoutPinned ? t('chat.unpinChatLayout') : t('chat.pinChatLayout')}>
              {chatLayoutPinned ? (
                <PushPin fontSize="small" />
              ) : (
                <PushPinOutlined fontSize="small" />
              )}
            </IconButton>
          ) : null}
          <IconButton size="small" onClick={handleMinimize} title={t('chat.minimizeDialog')}>
            <Minimize fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleCloseAllChats} title={t('chat.closeDialog')}>
            <Close fontSize="small" />
          </IconButton>
        </div>
      </div>

      <div className={styles.usersSelectContainer}>
        <UsersSelect
          selectedUsers={selectedUsers}
          onUsersChange={handleUsersChange}
          onUserSelect={handleUserSelect}
          isTouched={localIsUsersTouched}
          onBlur={handleUsersBlur}
          disabled={shouldLockUsersSelect}
          usersCache={usersCache}
          onUpdateUsersCache={updateUsersCache}
          onCheckExistingSession={handleCheckExistingSession}
          displayUserName={getDisplayUserName()}
        />
        {shouldShowTransferBanner ? (
          <div className={styles.transferRow}>
            <Box
              sx={{
                mt: 1.5,
                p: 1.25,
                borderRadius: 1,
                border: '1px solid',
                borderColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(144, 202, 249, 0.45)'
                    : theme.palette.primary.light,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(144, 202, 249, 0.1)'
                    : 'rgba(25, 118, 210, 0.08)',
              }}>
              <Typography
                variant="body2"
                sx={{
                  lineHeight: 1.4,
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.primary.light
                      : theme.palette.primary.dark,
                }}>
                {t('chat.dialogTransferredToOperator', {
                  fullName: transferRecipientDisplayName,
                })}
              </Typography>
            </Box>
          </div>
        ) : showTransferSection ? (
          <div className={styles.transferRow}>
            <TransferOperatorSelect
              disabled={isTransferLoading || !canTransferDialog}
              selectionResetKey={`${resolvedDialogIdForActions}-${selectedUsers[0] ?? ''}-${transferSelectionResetTick}`}
              onOperatorSelected={(id, label) => setPendingTransferOperator({ id, label })}
              onSelectionCleared={() => {
                setPendingTransferOperator(null);
                setTransferSelectionResetTick((tick) => tick + 1);
              }}
            />
          </div>
        ) : null}
      </div>

      <div className={styles.dialogActionsContainer}>
        {selectedUsers.length > 0 && (
          <DialogActions
            sessionId={sessionId}
            userId={selectedUsers[0]}
            dialogId={resolvedDialogIdForActions}
            hasExistingDialog={hasExistingDialog}
            onDialogStatusChange={updateDialogStatus}
            dialogData={selectedDialog}
            onBlockedStateChange={setIsDialogReallyBlocked}
            onCompleteButtonActiveChange={setIsCompleteButtonActive}
            showTransferButton={!!pendingTransferOperator}
            onTransferClick={() => {
              if (!pendingTransferOperator) return;
              void handleTransferToOperator(
                pendingTransferOperator.id,
                pendingTransferOperator.label,
              );
            }}
            isTransferLoading={isTransferLoading}
          />
        )}
      </div>

      <div className={styles.messageFeedContainer}>
        <MessageFeed
          sessionId={sessionId}
          messages={messages}
          onReplyToMessage={handleReplyToMessage}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          attachments={attachments}
          onRemoveAttachment={handleRemoveAttachment}
          userId={selectedUsers[0]}
          selectedUserName={selectedUserName}
          onMarkMessagesAsRead={handleMarkMessagesAsRead}
          unreadCount={feedUnreadFromMessages}
          expandUnreadHintCount={displayUnreadCount}
          scrollToBottomOnExpand={shouldScrollToFirstUnreadOnExpand}
          onScrollToBottomDone={onScrollToBottomDone}
          dialogStatus={dialogStatus}
          isDialogBlockedByOtherOperator={effectiveBlockedByOtherOperator}
          isClosedObserverMode={hasForeignOwnerInClosedState}
          isDialogEnded={isDialogEnded}
        />
      </div>

      <div className={styles.messageInputContainer}>
        <MessageInput
          selectedUsers={selectedUsers}
          isUsersTouched={localIsUsersTouched}
          onUsersBlur={handleUsersBlur}
          onMessageSent={handleMessageSent}
          onEndDialog={handleEndDialog}
          isDialogEnded={isDialogEnded}
          clearInput={localClearMessageInput}
          onClearComplete={() => setLocalClearMessageInput(false)}
          initialText={messageText}
          onTextChange={handleMessageTextChange}
          sessionId={sessionId}
          replyTarget={replyTarget}
          onClearReply={handleClearReply}
          onAttachmentsChange={handleAttachmentsChange}
          attachments={attachments}
          isSendingMessage={isSendingMessage}
          lastSendError={lastSendError}
          dialogStatus={dialogStatus}
          isDialogBlockedByOtherOperator={effectiveBlockedByOtherOperator}
          blockingOperatorLabel={
            effectiveBlockedByOtherOperator ? blockingOperatorDisplay || undefined : undefined
          }
          suppressBlockedWarning={shouldShowTransferBanner}
        />
      </div>
    </div>
  );
}

export default ChatPanel;
