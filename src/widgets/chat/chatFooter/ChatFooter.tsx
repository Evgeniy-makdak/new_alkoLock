import { useCallback, useEffect, useRef, useState } from 'react';

import { Add as AddIcon, Chat as ChatIcon, Close as CloseIcon } from '@mui/icons-material';
import { Card, IconButton, Tooltip } from '@mui/material';

import { appStore } from '@shared/model/app_store/AppStore';

import ChatPanel from '../components/ChatPanel';
import { ChatProvider, useChat } from '../contexts/ChatContext';
import { SocketProvider, useSocket } from '../contexts/SocketContext';
import styles from './ChatFooter.module.scss';

const UnreadMessagesBadge = ({ count }: { count: number }) => {
  return <span className={styles.notifications}>{count > 99 ? '99+' : count}</span>;
};

const useOperatorPermissions = () => {
  const [hasChatPermissions, setHasChatPermissions] = useState(false);

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      const permissions = appStore.getState().permissions || [];

      const hasPermissions = permissions.some((permission: string) =>
        permission.includes('PERMISSION_OPERATOR_CHATS'),
      );

      setHasChatPermissions(hasPermissions);
    });

    const initialPermissions = appStore.getState().permissions || [];
    const hasInitialPermissions = initialPermissions.some((permission: string) =>
      permission.includes('PERMISSION_OPERATOR_CHATS'),
    );
    setHasChatPermissions(hasInitialPermissions);

    return unsubscribe;
  }, []);

  return hasChatPermissions;
};

const ChatToggleButton = () => {
  const { isChatOpen, setIsChatOpen, sessions, closeSession, createNewSession } = useChat();
  const { unreadCount } = useSocket();

  const handleToggle = () => {
    if (isChatOpen) {
      sessions.forEach((session) => {
        closeSession(session.id);
      });
      setIsChatOpen(false);
    } else {
      setIsChatOpen(true);
      createNewSession();
    }
  };

  const tooltipTitle = `Непрочитанных сообщений: ${unreadCount} (Shift + Ctrl + D)`;

  return (
    <Tooltip title={tooltipTitle} placement="left">
      <div className={styles.toggleButtonWrapper}>
        <IconButton
          className={styles.toggleButton}
          onClick={handleToggle}
          color="primary"
          size="large">
          {isChatOpen ? <CloseIcon /> : <ChatIcon />}
        </IconButton>
        <UnreadMessagesBadge count={unreadCount} />
      </div>
    </Tooltip>
  );
};

const NewChatButton = () => {
  const { createNewSession, sessions, toggleSessionMinimize, setActiveSessionId } = useChat();

  const handleNewChat = () => {
    sessions.forEach((session) => {
      if (!session.isMinimized) {
        toggleSessionMinimize(session.id);
      }
    });

    const newSessionId = createNewSession();
    setActiveSessionId(newSessionId);
  };

  if (sessions.length === 0) return null;

  return (
    <Tooltip title="Открыть новый чат" placement="left">
      <div className={styles.newChatButtonWrapper}>
        <IconButton
          className={styles.newChatButton}
          onClick={handleNewChat}
          color="primary"
          size="large">
          <AddIcon />
        </IconButton>
      </div>
    </Tooltip>
  );
};

const ChatContainer = () => {
  const {
    isChatOpen,
    sessions,
    setActiveSessionId,
    closeSession,
    expandSession,
    toggleSessionMinimize,
    setIsChatOpen,
    openUnreadDialog,
    hasSessionWithUser,
    dialogsUnreadCounts,
    setDialogsUnreadCounts,
  } = useChat();
  const { lastMessage, setUnreadCount } = useSocket();
  const [isVisible, setIsVisible] = useState(true);
  const lastDetailsUpdateRef = useRef<number>(0);
  const processedMessagesRef = useRef<Map<string, number>>(new Map());
  const [justExpandedSessionId, setJustExpandedSessionId] = useState<string | null>(null);
  const hasChatPermissions = useOperatorPermissions();

  const getMessageId = (message: any): string => {
    if (!message) return 'empty';

    if (message.type && message.data) {
      if (Array.isArray(message.data)) {
        const arrayHash = message.data
          .map((item: any) => `${item.dialogId}_${item.countUnMessages}`)
          .join('|');
        return `${message.type}_${arrayHash}`;
      } else if (typeof message.data === 'object') {
        const dataStr = JSON.stringify({
          countUnMessages: message.data.countUnMessages,
          dialogId: message.data.dialogId,
        });
        return `${message.type}_${dataStr}`;
      }
    }

    return `${message.type}_${JSON.stringify(message.data)}`;
  };

  useEffect(() => {
    if (!lastMessage) return;

    const messageId = getMessageId(lastMessage);
    const now = Date.now();
    const lastProcessed = processedMessagesRef.current.get(messageId);

    if (lastProcessed && now - lastProcessed < 30000) {
      return;
    }

    processedMessagesRef.current.set(messageId, now);

    const cleanupThreshold = now - 30000;
    processedMessagesRef.current.forEach((timestamp, id) => {
      if (timestamp < cleanupThreshold) {
        processedMessagesRef.current.delete(id);
      }
    });

    const currentBranchId = appStore.getState().selectedBranchState?.id;

    if (lastMessage.type === `/queue/unread/${currentBranchId}`) {
      const messageData = lastMessage.data;

      const now = Date.now();
      const lastUpdate = lastDetailsUpdateRef.current;
      if (lastUpdate && now - lastUpdate < 5000) {
        return;
      }
      lastDetailsUpdateRef.current = now;

      if (Array.isArray(messageData)) {
        const newCountsMap = new Map<number, number>();

        messageData.forEach((item: { dialogId: number; countUnMessages: number }) => {
          if (item.dialogId && item.countUnMessages !== undefined) {
            newCountsMap.set(item.dialogId, item.countUnMessages);
          }
        });

        setDialogsUnreadCounts(newCountsMap);
      }
    }

    if (
      lastMessage.type === '/user/queue/unread' &&
      lastMessage.data?.countUnMessages !== undefined
    ) {
      setUnreadCount(lastMessage.data.countUnMessages);
    }

    if (
      lastMessage.data &&
      lastMessage.data.countUnMessages !== undefined &&
      !Array.isArray(lastMessage.data)
    ) {
      setUnreadCount(lastMessage.data.countUnMessages);
    }
  }, [lastMessage, setUnreadCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.ctrlKey) {
        const key = event.key.toLowerCase();
        if (key === 'd' || key === 'в') {
          event.preventDefault();
          setIsVisible((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (sessions.length === 0 && isChatOpen) {
      setIsChatOpen(false);
    } else if (sessions.length > 0 && !isChatOpen) {
      setIsChatOpen(true);
    }
  }, [sessions, isChatOpen, setIsChatOpen]);

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      const currentBranchId = appStore.getState().selectedBranchState?.id;

      if (currentBranchId !== undefined) {
        sessions.forEach((session) => {
          closeSession(session.id);
        });
      }
    });

    return () => unsubscribe();
  }, [sessions, closeSession]);

  const handleToggleSessionMinimize = (sessionId: string) => {
    toggleSessionMinimize(sessionId);
    setActiveSessionId(null);
  };

  const handleExpandSession = useCallback(
    (sessionId: string) => {
      setJustExpandedSessionId(sessionId);
      expandSession(sessionId);
    },
    [expandSession],
  );

  const handleScrollToBottomDone = useCallback(() => {
    setJustExpandedSessionId(null);
  }, []);

  const getUnreadCountForDialog = (dialogId: number): number => {
    return dialogsUnreadCounts.get(dialogId) || 0;
  };

  if (!hasChatPermissions) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  const expandedSessions = sessions.filter((session) => !session.isMinimized);
  const minimizedSessions = sessions.filter((session) => session.isMinimized);

  return (
    <div className={styles.chatContainer}>
      <NewChatButton />
      <ChatToggleButton />

      <div className={styles.minimizedChats}>
        {minimizedSessions.map((session, index) => (
          <div
            key={`minimized-${session.id}`}
            className={`${styles.minimizedChat} ${
              (session.unreadCount ?? 0) > 0 ? styles.hasUnread : ''
            }`}
            style={{
              bottom: `${120 + index * 60}px`,
              right: '540px',
              zIndex: 1000 - index,
            }}
            onClick={() => handleExpandSession(session.id)}>
            <div className={styles.minimizedHeader}>
              <span>
                {session.selectedUserName || session.selectedDialog?.client_name || 'Новый чат'}
              </span>
              <span className={styles.unreadBadge}>
                {(session.unreadCount ?? 0) > 99 ? '99+' : (session.unreadCount ?? 0)}
              </span>
            </div>
            {session.messages.length > 0 && (
              <div className={styles.lastMessage}>
                {session.messages[session.messages.length - 1].text?.substring(0, 30)}...
              </div>
            )}
          </div>
        ))}

        {sessions.map((session) =>
          session.unreadDialogs
            ?.filter((dialog) => {
              const dialogUserId = dialog.owner?.id;
              if (dialogUserId && hasSessionWithUser(dialogUserId)) {
                return false;
              }
              return true;
            })
            ?.map((dialog, index) => {
              const unreadCount = getUnreadCountForDialog(dialog.id);

              return (
                <div
                  key={`unread-${dialog.id}-${session.id}-${index}`}
                  className={`${styles.minimizedChat} ${styles.unreadDialog} ${
                    getUnreadCountForDialog(dialog.id) > 0 ? styles.hasUnread : ''
                  }`}
                  style={{
                    bottom: `${120 + (minimizedSessions.length + index) * 60}px`,
                    right: '540px',
                    zIndex: 1000 - (minimizedSessions.length + index),
                  }}
                  onClick={async () => {
                    if (session.id) {
                      await openUnreadDialog(session.id, dialog);
                    }
                  }}>
                  <div className={styles.minimizedHeader}>
                    <span>{dialog.owner.fullName}</span>
                    <span className={styles.unreadBadge}>{unreadCount}</span>
                  </div>
                  <div className={styles.lastMessage}>
                    {unreadCount > 0
                      ? `Непрочитанных сообщений: ${unreadCount} • ${dialog.branch.name}`
                      : `Новый диалог • ${dialog.branch.name}`}
                  </div>
                </div>
              );
            }),
        )}
      </div>

      {expandedSessions.map((session) => (
        <Card key={`expanded-${session.id}`} className={`${styles.chatFooter} ${styles.expanded}`}>
          <ChatPanel
            sessionId={session.id}
            onMinimize={() => handleToggleSessionMinimize(session.id)}
            scrollToBottomOnExpand={justExpandedSessionId === session.id}
            onScrollToBottomDone={handleScrollToBottomDone}
          />
        </Card>
      ))}
    </div>
  );
};

const ChatFooter = () => {
  return (
    <SocketProvider>
      <ChatProvider>
        <ChatContainer />
      </ChatProvider>
    </SocketProvider>
  );
};

export default ChatFooter;
