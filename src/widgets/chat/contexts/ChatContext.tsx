import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { appStore } from '@shared/model/app_store/AppStore';

import { ChatConfig } from '../contexts/chatConfig';
import { useSocket } from './SocketContext';
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

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [dialogsUnreadCounts, setDialogsUnreadCounts] = useState<Map<number, number>>(new Map());

  const refs = useChatRefs();
  const prevIsChatOpenRef = refs.prevIsChatOpenRef;
  const sessionsRef = useRef<any[]>([]);

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
  } = useChatSessions();

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

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
    assignDialog,
    forceLoadUnreadDialogs,
    loadUnreadDialogs,
    loadDialogDetails,
    openUnreadDialog,
    loadingUnreadDialogsRef,
  } = useChatDialogs(getSession, updateSession);

  const {
    uploadAttachments,
    addPendingAttachments,
    setPendingAttachments,
    clearPendingAttachments,
    getPendingAttachments,
  } = useChatAttachments(getSession, updateSession);

  const { lastMessage, stompClient } = useSocket();

  const statusHandlers = useChatStatusHandlers(refs, {
    getSession,
    updateSession,
    sendMessageStatus: (uuid: string, status: 'DELIVERED' | 'READ') => {
      return sendMessageStatus(uuid, status);
    },
  });

  const dialogHandlers = useChatDialogHandlers(refs, {
    getSession,
    updateSession,
    assignDialog,
  });

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

      if (hasChanges) setDialogsUnreadCounts(newCounts);
    },
    [dialogsUnreadCounts],
  );

  const updateSessionUnreadCount = useCallback(
    (sessionId: string, dialogId: string) => {
      const session = getSession(sessionId);
      if (!session?.messages) return;

      const dialogIdStr = String(dialogId);
      const count = session.messages.filter((msg: any) => {
        const msgDialogId = msg.dialogId?.toString() || msg.dialog?.id?.toString() || '';
        return (
          msgDialogId === dialogIdStr &&
          msg.messageStatus === 'TO_OPERATOR' &&
          (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
          !msg.is_read
        );
      }).length;

      updateSession(sessionId, { unreadCount: count });
    },
    [getSession, updateSession],
  );

  /** Пересчёт unreadCount для сессии (для обновления превью при READ/новых сообщениях) */
  const recalculateSessionUnreadCount = useCallback(
    (sessionId: string, dialogId?: string) => {
      const session = getSession(sessionId);
      if (!session?.messages) return;

      const effectiveDialogId =
        dialogId ||
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
            !msg.is_read,
        ).length;
        updateSession(sessionId, { unreadCount: count });
      }
    },
    [getSession, updateSessionUnreadCount, updateSession],
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
        const sessionDialogId = session.selectedDialog?.id || session.assignedDialogId;

        if (sessionDialogId && sessionDialogId.toString() === dialogId.toString()) {
          updateSession(session.id, {
            selectedDialog: {
              ...session.selectedDialog,
              status: dialogStatus,
            },
            ...(dialogStatus !== 'CLOSED' && { assignedDialogId: null }),
          });

          if (dialogStatus !== 'CLOSED') {
            updateSession(session.id, {
              lastSendError: null,
            });
          }
        }
      });
    },
    [sessions, updateSession],
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

      console.log(
        `[STATUS WS] Получен статус от бэка: uuid=${uuidMessage}, status=${status}, needConfirm=${needConfirm}`,
      );

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
          console.log(`[STATUS WS] Подтверждение отправлено на бэк: ${status} для ${uuidMessage}`);
        } catch (error) {
          console.error('Ошибка подтверждения статуса:', error);
        }
      }

      if (status !== 'READ' && refs.processedReadStatusesRef.current.has(uuidMessage)) {
        console.log(
          `[STATUS WS] Пропуск применения ${status} для uuid=${uuidMessage}: уже отправлен READ`,
        );
        return;
      }

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
            console.log(`[STATUS WS] Локально установлен READ для сообщения ${uuidMessage}`);
            const dialogId =
              currentMessage.dialog?.id?.toString() || currentMessage.dialogId?.toString();
            recalculateSessionUnreadCount(session.id, dialogId);
          } else if (status === 'DELIVERED') {
            refs.deliveredStatusesRef.current.add(uuidMessage);
            refs.deliveredConfirmedByBackendRef.current.add(uuidMessage);
            console.log(`[STATUS WS] Локально установлен DELIVERED для сообщения ${uuidMessage}`);
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

            if (!messageElement) {
              console.log(`[READ] Элемент сообщения не найден в DOM: uuid=${uuidMessage}`);
              return false;
            }

            const scrollContainer = messageElement.closest(
              '[data-session-id], [class*="feed"], [class*="Feed"]',
            );
            if (!scrollContainer) {
              console.log(`[READ] Контейнер прокрутки не найден для uuid=${uuidMessage}`);
              return false;
            }

            const containerRect = scrollContainer.getBoundingClientRect();
            const messageRect = messageElement.getBoundingClientRect();

            const isVisible =
              messageRect.top < containerRect.bottom &&
              messageRect.bottom > containerRect.top &&
              messageRect.left < containerRect.right &&
              messageRect.right > containerRect.left;

            if (!isVisible) {
              console.log(`[READ] Сообщение не видимо в контейнере: uuid=${uuidMessage}`);
            } else {
              console.log(`[READ] Сообщение видимо в контейнере: uuid=${uuidMessage}`);
            }

            return isVisible;
          };

          if (!isMessageVisible()) {
            console.log(
              `[READ] Сообщение не видимо, оставляем в pending: uuid=${uuidMessage}, sessionId=${pendingSessionId}`,
            );
            return;
          }

          refs.pendingReadAfterDeliveredConfirmRef.current.delete(uuidMessage);
          console.log(
            `[READ] Отправка READ после подтверждения DELIVERED от бэка (сообщение видимо): uuid=${uuidMessage}, sessionId=${pendingSessionId}`,
          );
          refs.processedReadStatusesRef.current.add(uuidMessage);
          const sent = sendMessageStatus(uuidMessage, 'READ');
          if (sent) {
            console.log(`[READ] Статус READ отправлен (pending): uuid=${uuidMessage}`);
            const session = getSession(pendingSessionId);
            if (session?.messages) {
              const updatedMessages = session.messages.map((msg: any) =>
                msg.uuid === uuidMessage ? { ...msg, confirmStatus: 'READ', is_read: true } : msg,
              );
              updateSession(pendingSessionId, { messages: updatedMessages });
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
      const incomingUserId = messageData?.createdBy?.id;
      if (!incomingUserId) return;

      const messageId = messageData.uuid || messageData.id;
      if (messageId && refs.processedIncomingMessagesRef.current.has(messageId)) {
        return;
      }

      if (messageId) {
        refs.processedIncomingMessagesRef.current.add(messageId);
        setTimeout(() => refs.processedIncomingMessagesRef.current.delete(messageId), 5000);
      }

      const currentSessions = sessionsRef.current;
      const userIdNum = parseInt(String(incomingUserId), 10);
      const messageDialogId = messageData.dialog?.id ?? messageData.dialogId;
      const dialogIdStr = messageDialogId != null ? String(messageDialogId) : null;

      let existingSession = currentSessions.find(
        (s) => s.selectedUsers && s.selectedUsers.includes(userIdNum),
      );
      if (!existingSession && dialogIdStr) {
        existingSession = currentSessions.find(
          (s) =>
            (s.selectedDialog?.id != null && String(s.selectedDialog.id) === dialogIdStr) ||
            (s.assignedDialogId != null && String(s.assignedDialogId) === dialogIdStr),
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
      if (!existingSession && dialogIdStr && currentSessions.length > 0) {
        existingSession = currentSessions.find((s) =>
          s.messages?.some((m: any) => String(m.dialog?.id ?? m.dialogId ?? '') === dialogIdStr),
        );
      }
      let foundViaUnreadDialogs = false;
      let dialogToOpen: any = null;
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
            dialogToOpen = matchingDialog;
          } else if (messageData.dialog) {
            existingSession = sessionWithUnread;
            foundViaUnreadDialogs = true;
            dialogToOpen = messageData.dialog;
          }
        }
      }

      if (existingSession) {
        if (foundViaUnreadDialogs && dialogToOpen) {
          await forceLoadUnreadDialogs(existingSession.id);
          await dialogHandlers.openUnreadDialogWithStatus(
            existingSession.id,
            dialogToOpen,
            openUnreadDialog,
          );
        }

        await messageHandlers.addMessageFromWebSocket(existingSession.id, messageData);

        const wasClaimed = existingSession.assignedDialogId || existingSession.selectedDialog?.id;
        if (foundViaUnreadDialogs) {
          expandSession(existingSession.id);
          setActiveSessionId(existingSession.id);
        } else if (existingSession.isMinimized && wasClaimed) {
          expandSession(existingSession.id);
          const dialogId =
            messageData.dialog?.id ?? messageData.dialogId ?? existingSession.selectedDialog?.id;
          if (dialogId) {
            dialogHandlers.forceRefreshSessionMessages(existingSession.id).catch(() => {});
          }
        } else if (!existingSession.isMinimized) {
          setActiveSessionId(existingSession.id);
        }

        refreshAllOpenSessions();

        const dialogId = messageData.dialog?.id;
        if (ChatConfig.DISABLE_PAGINATION && dialogId) {
          messageHandlers.debouncedSyncDialogHistory(existingSession.id, dialogId.toString());
        }

        if (existingSession.isMinimized) {
          if (
            messageData.messageStatus === 'TO_OPERATOR' &&
            (messageData.confirmStatus === 'SENT' || messageData.confirmStatus === 'DELIVERED') &&
            !messageData.is_read
          ) {
            incrementUnreadCount(existingSession.id, 1);
          }
        } else {
          const messageDialogId = messageData.dialog?.id || messageData.dialogId;
          const sessionDialogId =
            existingSession.selectedDialog?.id || existingSession.assignedDialogId;

          setTimeout(() => {
            if (messageDialogId) {
              updateSessionUnreadCount(existingSession.id, messageDialogId.toString());
            } else if (sessionDialogId && sessionDialogId !== '0') {
              updateSessionUnreadCount(existingSession.id, sessionDialogId.toString());
            }
          }, 200);
        }

        if (
          messageData.uuid &&
          !refs.deliveredStatusesRef.current.has(messageData.uuid) &&
          messageData.messageStatus === 'TO_OPERATOR' &&
          messageData.confirmStatus === 'SENT'
        ) {
          setTimeout(() => {
            const currentSession = getSession(existingSession.id);
            if (currentSession?.selectedDialog?.status) {
              const sendResult = statusHandlers.sendDeliveredStatusForNewMessage(
                existingSession.id,
                messageData.uuid,
              );
              if (sendResult) {
                refs.deliveredStatusesRef.current.add(messageData.uuid);
              }
            }
          }, 1000);
        }

        return;
      } else {
        const hasExpanded = currentSessions.some((s) => !s.isMinimized);
        const newSessionId = enhancedCreateNewSession({ asMinimized: hasExpanded });
        await new Promise((r) => setTimeout(r, 0));
        const newSession = getSession(newSessionId);

        if (newSession) {
          const dialogId = messageData.dialog?.id ?? messageData.dialogId;
          const dialogIdStr = dialogId != null ? String(dialogId) : null;

          if (dialogId && messageData.dialog) {
            updateSession(newSessionId, {
              selectedDialog: messageData.dialog,
              assignedDialogId: messageData.dialog.id?.toString() ?? String(dialogId),
            });
          }

          if (!hasExpanded && dialogIdStr) {
            await forceLoadUnreadDialogs(newSessionId);
            await dialogHandlers.loadDialogHistory(newSessionId, dialogIdStr, true, 0, true);
          }

          await messageHandlers.addMessageFromWebSocket(newSessionId, messageData);

          expandSession(newSessionId);
          setActiveSessionId(newSessionId);

          fetchUserInfo(parseInt(incomingUserId)).then((userData: any) => {
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

          if (dialogId) {
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
              if (currentSession?.selectedDialog?.status) {
                const sendResult = statusHandlers.sendDeliveredStatusForNewMessage(
                  newSessionId,
                  messageData.uuid,
                );
                if (sendResult) {
                  refs.deliveredStatusesRef.current.add(messageData.uuid);
                }
              }
            }, 1000);
          }
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
      openUnreadDialog,
      forceLoadUnreadDialogs,
      incrementUnreadCount,
      sendMessageStatus,
      setActiveSessionId,
      expandSession,
      refreshAllOpenSessions,
      updateSessionUnreadCount,
      refs,
    ],
  );

  useEffect(() => {
    const processIncomingMessage = async () => {
      if (!lastMessage) return;

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

      if (lastMessage.type === 'DIALOGS_UPDATE') return;

      if (lastMessage.type === 'error' || lastMessage.destination === '/user/queue/errors') {
        const errorData = lastMessage.data;
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
              lastSendError: errorData.message || 'Диалог не заблокирован. Нажмите "Забрать"',
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
              lastSendError: errorData.message || 'Внутренняя ошибка сервера',
            });
          }
        }
        return;
      }

      if (
        lastMessage.type === 'DIALOG_STATUS_UPDATE' ||
        lastMessage.type?.includes('/topic/dialog/status/')
      ) {
        const dialogStatusData = lastMessage.data;
        const statusKey = `${dialogStatusData.dialogId}_${dialogStatusData.dialogStatus}`;
        if (refs.processedDialogStatusesRef.current.has(statusKey)) return;

        refs.processedDialogStatusesRef.current.add(statusKey);
        setTimeout(() => refs.processedDialogStatusesRef.current.delete(statusKey), 10000);

        handleDialogStatusUpdate(dialogStatusData);
        return;
      }

      if (lastMessage.type === '/user/queue/unread') {
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

      if (lastMessage.type === '/user/queue/messages') {
        await handleIncomingMessage(lastMessage.data);
        return;
      }

      if (lastMessage.type === 'OPERATOR_MESSAGE') {
        let messageData = lastMessage.data;
        if (
          messageData?.content &&
          Array.isArray(messageData.content) &&
          messageData.content.length > 0
        ) {
          messageData = messageData.content[0];
        }
        if (messageData) {
          await handleIncomingMessage(messageData);
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
    refs,
  ]);

  useEffect(() => {
    if (sessions.length > 1) removeDuplicateSessions();
  }, [sessions, removeDuplicateSessions]);

  useEffect(() => {
    if (isChatOpen && activeSessionId) {
      const session = getSession(activeSessionId);
      if (session?.messages?.length > 0 && !session.isMinimized) {
        if (!session.selectedDialog?.status) return;

        const timerId = setTimeout(() => {
          const sentMessages = session.messages.filter(
            (msg: any) => msg.messageStatus === 'TO_OPERATOR' && msg.confirmStatus === 'SENT',
          );

          if (sentMessages.length > 0) {
            console.log(
              `[DELIVERED] Диалог открыт: отправка DELIVERED для ${sentMessages.length} сообщений (sessionId=${activeSessionId})`,
            );
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
    if (isChatOpen && sessions.length > 0 && activeSessionId) {
      const session = getSession(activeSessionId);
      if (session && !session.isLoadingUnreadDialogs && session.unreadDialogs.length === 0) {
        forceLoadUnreadDialogs(activeSessionId);
      }
    }
  }, [isChatOpen, activeSessionId]);

  const openUnreadDialogWithStatus = useCallback(
    async (sessionId: string, dialog: any) => {
      return dialogHandlers.openUnreadDialogWithStatus(sessionId, dialog, openUnreadDialog);
    },
    [dialogHandlers.openUnreadDialogWithStatus, openUnreadDialog],
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
