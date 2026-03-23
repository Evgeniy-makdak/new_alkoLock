import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Add as AddIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';

import { appStore } from '@shared/model/app_store/AppStore';

import type { UnreadDialog } from '../api/dialogsApi';
import ChatPanel from '../components/ChatPanel';
import { ChatProvider, useChat } from '../contexts/ChatContext';
import { SocketProvider, useSocket } from '../contexts/SocketContext';
import styles from './ChatFooter.module.scss';

/** Должно совпадать с медиазапросом скрытия `.minimizedChats` в ChatFooter.module.scss */
const CHAT_COMPACT_MINIMIZED_QUERY = '(max-width: 1024px)';

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
  const { t } = useTranslation();
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

  const tooltipTitle = t('chat.toggleTooltip', { count: unreadCount });

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
  const { t } = useTranslation();
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
    <Tooltip title={t('chat.openNewChat')} placement="left">
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
  const { t } = useTranslation();
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
  } = useChat();
  const { lastMessage, setUnreadCount, dialogsUnreadCounts } = useSocket();
  const [isVisible, setIsVisible] = useState(true);
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

    // Инкремент unreadCount для свёрнутых сессий выполняется в ChatContext.handleIncomingMessage
    // через атомарный incrementUnreadCount — дублирование здесь убрано
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
    [expandSession, sessions],
  );

  const handleScrollToBottomDone = useCallback(() => {
    setJustExpandedSessionId(null);
  }, []);

  const getUnreadCountForDialog = (dialogId: number): number => {
    return (dialogsUnreadCounts || new Map()).get(dialogId) || 0;
  };

  const isCompactMinimizedUi = useMediaQuery(CHAT_COMPACT_MINIMIZED_QUERY);
  const [minimizedListOpen, setMinimizedListOpen] = useState(false);

  type CompactMinimizedEntry =
    | {
        kind: 'session';
        key: string;
        sessionId: string;
        title: string;
        subtitle?: string;
        unread: number;
      }
    | {
        kind: 'unread';
        key: string;
        sessionId: string;
        dialog: UnreadDialog;
        title: string;
        subtitle: string;
        unread: number;
      };

  const compactMinimizedEntries = useMemo((): CompactMinimizedEntry[] => {
    const minimized = sessions.filter((s) => s.isMinimized);
    const items: CompactMinimizedEntry[] = [];

    minimized.forEach((session) => {
      items.push({
        kind: 'session',
        key: `minimized-${session.id}`,
        sessionId: session.id,
        title:
          session.selectedUserName ||
          session.selectedDialog?.client_name ||
          t('chat.newChatFallback'),
        subtitle:
          session.messages.length > 0
            ? `${session.messages[session.messages.length - 1].text?.substring(0, 60) ?? ''}…`
            : undefined,
        unread: session.unreadCount ?? 0,
      });
    });

    sessions.forEach((session) => {
      const unreadList =
        session.unreadDialogs?.filter((dialog) => {
          const dialogUserId = dialog.owner?.id;
          if (dialogUserId && hasSessionWithUser(dialogUserId)) {
            return false;
          }
          return true;
        }) ?? [];

      unreadList.forEach((dialog, index) => {
        const unreadCount = (dialogsUnreadCounts || new Map()).get(dialog.id) || 0;
        items.push({
          kind: 'unread',
          key: `unread-${dialog.id}-${session.id}-${index}`,
          sessionId: session.id,
          dialog,
          title: dialog.owner.fullName,
          subtitle:
            unreadCount > 0
              ? t('chat.unreadInBranch', {
                  count: unreadCount,
                  branch: dialog.branch.name,
                })
              : t('chat.newDialogInBranch', { branch: dialog.branch.name }),
          unread: unreadCount,
        });
      });
    });

    return items;
  }, [sessions, dialogsUnreadCounts, hasSessionWithUser, t]);

  if (!hasChatPermissions) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  const expandedSessions = sessions.filter((session) => !session.isMinimized);
  const minimizedSessions = sessions.filter((session) => session.isMinimized);

  const hasUnreadInCompactList = compactMinimizedEntries.some((e) => e.unread > 0);

  return (
    <div className={styles.chatContainer}>
      <NewChatButton />
      {isCompactMinimizedUi && compactMinimizedEntries.length > 0 && (
        <>
          <Tooltip title={t('chat.minimizedListTooltip')} placement="left">
            <div className={styles.showMinimizedButtonWrapper}>
              <IconButton
                className={styles.showMinimizedButton}
                onClick={() => setMinimizedListOpen(true)}
                color="primary"
                size="large"
                aria-label={t('chat.minimizedListTooltip')}>
                <ViewListIcon />
              </IconButton>
              <span
                className={
                  hasUnreadInCompactList
                    ? styles.minimizedListCountBadgeUnread
                    : styles.minimizedListCountBadge
                }
                aria-hidden>
                {compactMinimizedEntries.length > 99 ? '99+' : compactMinimizedEntries.length}
              </span>
            </div>
          </Tooltip>
          <Drawer
            anchor="bottom"
            open={minimizedListOpen}
            onClose={() => setMinimizedListOpen(false)}
            slotProps={{
              paper: {
                sx: {
                  maxHeight: '55vh',
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                },
              },
            }}>
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {t('chat.minimizedListTitle')}
              </Typography>
            </Box>
            <List dense disablePadding sx={{ pb: 2, px: 0.5 }}>
              {compactMinimizedEntries.map((entry) => (
                <ListItemButton
                  key={entry.key}
                  sx={{ alignItems: 'flex-start', gap: 1, py: 1.25 }}
                  onClick={() => {
                    setMinimizedListOpen(false);
                    if (entry.kind === 'session') {
                      handleExpandSession(entry.sessionId);
                    } else {
                      void openUnreadDialog(entry.sessionId, entry.dialog);
                    }
                  }}>
                  <ListItemText
                    sx={{ flex: '1 1 auto', minWidth: 0, my: 0 }}
                    primary={entry.title}
                    secondary={entry.subtitle}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                  {entry.unread > 0 ? (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        flexShrink: 0,
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                        borderRadius: '10px',
                        px: 0.75,
                        py: 0.25,
                        fontWeight: 600,
                        minWidth: 22,
                        textAlign: 'center',
                        lineHeight: 1.5,
                        mt: 0.25,
                      }}>
                      {entry.unread > 99 ? '99+' : entry.unread}
                    </Typography>
                  ) : null}
                </ListItemButton>
              ))}
            </List>
          </Drawer>
        </>
      )}
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
                {session.selectedUserName ||
                  session.selectedDialog?.client_name ||
                  t('chat.newChatFallback')}
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
                    unreadCount > 0 ? styles.hasUnread : ''
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
                      ? t('chat.unreadInBranch', {
                          count: unreadCount,
                          branch: dialog.branch.name,
                        })
                      : t('chat.newDialogInBranch', { branch: dialog.branch.name })}
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
