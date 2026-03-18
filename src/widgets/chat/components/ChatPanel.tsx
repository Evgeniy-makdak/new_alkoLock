import { useCallback, useEffect, useRef, useState } from 'react';

import { Close, Minimize } from '@mui/icons-material';
import { IconButton } from '@mui/material';

import api from '../api';
import { useChat } from '../contexts/ChatContext';
import styles from './ChatPanel.module.scss';
import { DialogActions } from './DialogActions';
import MessageFeed from './MessageFeed';
import MessageInput from './MessageInput';
import UsersSelect from './UsersSelect';

interface ChatPanelProps {
  sessionId: string;
  onMinimize?: () => void;
  scrollToBottomOnExpand?: boolean;
  onScrollToBottomDone?: () => void;
}

function ChatPanel({
  sessionId,
  onMinimize,
  scrollToBottomOnExpand,
  onScrollToBottomDone,
}: ChatPanelProps) {
  const {
    closeSession,
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

  const [localIsUsersTouched, setLocalIsUsersTouched] = useState(false);
  const [localHasSentMessage, setLocalHasSentMessage] = useState(false);
  const [localClearMessageInput, setLocalClearMessageInput] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dialogStatus, setDialogStatus] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isDialogReallyBlocked, setIsDialogReallyBlocked] = useState(false);

  const chatPanelMountIdRef = useRef(Math.random().toString(36).slice(2, 6));

  console.log(
    `[CP-${chatPanelMountIdRef.current}] render: sessionId=${sessionId}, scrollToBottomOnExpand=${scrollToBottomOnExpand}, msgs=${session?.messages?.length}, isMinimized=${session?.isMinimized}`,
  );

  const isUpdatingRef = useRef(false);
  const prevSessionIdRef = useRef<string>(sessionId);
  const lastMessageCountRef = useRef<number>(0);
  const lastStableUnreadCountRef = useRef<number>(0);
  const unreadCountDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDoneRef = useRef(false);
  const historyLoadAttemptedRef = useRef(false);
  const refreshAfterReadTriggeredRef = useRef(false);
  const isSessionSwitchingRef = useRef(false);

  useEffect(() => {
    console.log(
      `[CP-${chatPanelMountIdRef.current}] MOUNTED sessionId=${sessionId}, scrollToBottomOnExpand=${scrollToBottomOnExpand}`,
    );
    return () => {
      console.log(`[CP-${chatPanelMountIdRef.current}] UNMOUNTED sessionId=${sessionId}`);
    };
  }, []);

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

    unreadCountDebounceRef.current = setTimeout(() => {
      if (newCount !== lastStableUnreadCountRef.current) {
        setUnreadCount(newCount);
        lastStableUnreadCountRef.current = newCount;
      }
      unreadCountDebounceRef.current = null;
    }, 150);
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
        const currentMessageCount = session.messages.length;
        if (currentMessageCount !== lastMessageCountRef.current) {
          lastMessageCountRef.current = currentMessageCount;
        }

        const count = session.messages.reduce((acc: number, msg: any) => {
          if (
            msg.messageStatus === 'TO_OPERATOR' &&
            (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
            !msg.is_read
          ) {
            return acc + 1;
          }
          return acc;
        }, 0);

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
      refreshAfterReadTriggeredRef.current = false;
      isSessionSwitchingRef.current = false;
    }
  }, [sessionId]);

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
    if (
      session?.selectedDialog?.id &&
      session.selectedDialog.id !== '0' &&
      !historyLoadAttemptedRef.current &&
      (!session.messages || session.messages.length === 0)
    ) {
      historyLoadAttemptedRef.current = true;
      loadDialogHistory(sessionId, session.selectedDialog.id).catch(console.error);
    }
  }, [session?.selectedDialog?.id, session?.messages, sessionId, loadDialogHistory]);

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
        loadDialogHistory(sessionId, session.selectedDialog.id).then(() => {
          // После загрузки истории прокручиваем вниз
          setTimeout(() => {
            const messageFeed = document.querySelector(
              `[data-session-id="${sessionId}"] .${styles.feed}`,
            );
            if (messageFeed) {
              messageFeed.scrollTop = messageFeed.scrollHeight;
            }
          }, 100);
        });
      } else if (isDialogOpen && !hasDialogId) {
        loadMessagesByUserId(sessionId, userId)
          .catch(console.error)
          .finally(() => {
            // После загрузки сообщений прокручиваем вниз
            setTimeout(() => {
              const messageFeed = document.querySelector(
                `[data-session-id="${sessionId}"] .${styles.feed}`,
              );
              if (messageFeed) {
                messageFeed.scrollTop = messageFeed.scrollHeight;
              }
            }, 100);
          });
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
      const session = getSession(sessionId);
      if (!session?.selectedDialog?.id || session.selectedDialog.id === '0') return;

      api
        .getDialogDetails(session.selectedDialog.id)
        .then((dialogDetails) => {
          if (dialogDetails?.status && dialogDetails.status !== dialogStatus) {
            console.log(`Статус диалога изменился: ${dialogStatus} -> ${dialogDetails.status}`);
            setDialogStatus(dialogDetails.status);

            if (dialogStatus === 'CLOSED' && dialogDetails.status !== 'CLOSED') {
              updateSession(sessionId, {
                assignedDialogId: null,
                lastSendError: null,
              });
            }

            updateSession(sessionId, {
              selectedDialog: {
                ...session.selectedDialog,
                status: dialogDetails.status,
                lastOperator: dialogDetails.lastOperator,
              },
            });
          }
        })
        .catch((error) => {
          console.error('Ошибка проверки статуса диалога:', error);
        });
    }, 60000);

    return () => clearInterval(checkDialogStatusInterval);
  }, [sessionId, getSession, updateSession, dialogStatus, session?.selectedDialog?.id]);

  const handleUsersChange = useCallback(
    (users: number[]) => {
      const filteredUsers = users.filter((id) => id !== 0);
      updateSession(sessionId, { selectedUsers: filteredUsers });

      if (filteredUsers.length === 0) {
        updateSession(sessionId, {
          selectedUserName: '',
          clearMessageInput: true,
          messages: [],
        });
        setLocalClearMessageInput(true);
        setAttachments([]);
        clearPendingAttachments(sessionId);
        setDialogStatus('');
        stableSetUnreadCount(0);
        initialLoadDoneRef.current = false;
        historyLoadAttemptedRef.current = false;
        refreshAfterReadTriggeredRef.current = false;
      } else {
        initialLoadDoneRef.current = false;
        historyLoadAttemptedRef.current = false;
        refreshAfterReadTriggeredRef.current = false;
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
        setActiveSessionId(existingSession.id);
        isSessionSwitchingRef.current = true;

        if (!existingSession.isMinimized) {
          toggleSessionMinimize(sessionId);
        }

        setTimeout(() => {
          isSessionSwitchingRef.current = false;
        }, 100);

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
      refreshAfterReadTriggeredRef.current = false;
    },
    [sessionId, updateSession, session?.usersCache],
  );

  const handleMinimize = useCallback(() => {
    if (onMinimize) {
      onMinimize();
    } else {
      toggleSessionMinimize(sessionId);
      setActiveSessionId(null);
    }
  }, [sessionId, toggleSessionMinimize, onMinimize, setActiveSessionId]);

  const updateUsersCache = useCallback(
    (users: any[]) => {
      const newCache = new Map(session?.usersCache || new Map());
      users.forEach((user) => {
        if (user && user.id) newCache.set(user.id, user);
      });
      updateSession(sessionId, { usersCache: newCache });
    },
    [sessionId, updateSession, session?.usersCache],
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
      if (session?.selectedDialog) {
        updateSession(sessionId, {
          selectedDialog: {
            ...session.selectedDialog,
            status: status,
          },
        });
      }
    },
    [sessionId, updateSession, session?.selectedDialog],
  );

  const handleMarkMessagesAsRead = useCallback(
    (messageIds: string[]) => {
      if (messageIds.length > 0) {
        console.log('[READ] handleMarkMessagesAsRead вызван для messageIds:', messageIds);
        messageIds.forEach((messageId) => {
          sendReadStatusForMessageId(sessionId, messageId);
        });

        if (!refreshAfterReadTriggeredRef.current) {
          refreshAfterReadTriggeredRef.current = true;
          const idSet = new Set(messageIds);
          const updatedMessages = (session?.messages || []).map((msg: any) =>
            idSet.has(String(msg.id)) || idSet.has(String(msg.uuid))
              ? { ...msg, is_read: true, confirmStatus: 'READ' }
              : msg,
          );

          updateSession(sessionId, { messages: updatedMessages });

          setTimeout(() => {
            refreshAfterReadTriggeredRef.current = false;
          }, 5000);
        }
      }
    },
    [sessionId, sendReadStatusForMessageId, session?.messages, updateSession],
  );

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
  } = session;

  const userHasSentMessage =
    localHasSentMessage || messages.some((msg: { sender: string }) => msg.sender === 'user');

  if (isMinimized) {
    return (
      <div className={styles.minimizedPanel}>
        <div className={styles.minimizedHeader} onClick={() => toggleSessionMinimize(sessionId)}>
          <h3>{selectedUserName || selectedDialog?.client_name || 'Диалог с пользователем'}</h3>
          {unreadCount > 0 && (
            <span className={styles.unreadBadgeMinimized}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <IconButton
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

  const hasExistingDialog = selectedDialog && selectedDialog.id !== '0';

  return (
    <div className={styles.panel} data-session-id={sessionId}>
      <div className={styles.chatHeader}>
        <h3>{selectedUserName || selectedDialog?.client_name || 'Диалог с пользователем'}</h3>
        {unreadCount > 0 && (
          <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
        <div className={styles.headerActions}>
          <IconButton size="small" onClick={handleMinimize} title="Свернуть диалог">
            <Minimize fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => closeSession(sessionId)} title="Закрыть диалог">
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
          disabled={userHasSentMessage || isDialogEnded}
          usersCache={usersCache}
          onUpdateUsersCache={updateUsersCache}
          onCheckExistingSession={handleCheckExistingSession}
          displayUserName={getDisplayUserName()}
        />
      </div>

      <div className={styles.dialogActionsContainer}>
        {selectedUsers.length > 0 && (
          <DialogActions
            sessionId={sessionId}
            userId={selectedUsers[0]}
            dialogId={selectedDialog?.id || '0'}
            hasExistingDialog={hasExistingDialog}
            onDialogStatusChange={updateDialogStatus}
            dialogData={selectedDialog}
            onBlockedStateChange={setIsDialogReallyBlocked}
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
          unreadCount={unreadCount}
          scrollToBottomOnExpand={scrollToBottomOnExpand}
          onScrollToBottomDone={onScrollToBottomDone}
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
          isDialogBlockedByOtherOperator={isDialogReallyBlocked}
        />
      </div>
    </div>
  );
}

export default ChatPanel;
