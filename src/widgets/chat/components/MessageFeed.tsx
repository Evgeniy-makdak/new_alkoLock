import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BsArrowDown, BsCheck2, BsCheck2All, BsPencil } from 'react-icons/bs';
import { FaReply, FaTimes, FaTrash } from 'react-icons/fa';

import dayjs from 'dayjs';

import { CircularProgress } from '@mui/material';

import { useChat } from '../contexts/ChatContext';
import { operatorUnreadDebug } from '../lib/operatorUnreadDebugLog';
import styles from './MessageFeed.module.scss';

interface MessageFeedProps {
  sessionId: string;
  messages: any[];
  onReplyToMessage?: (message: any) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  currentUserId?: number;
  attachments?: File[];
  onRemoveAttachment?: (index: number) => void;
  userId?: number;
  onLoadMore?: (page: number) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  selectedUserName?: string;
  currentPage?: number;
  totalPages?: number;
  onMarkMessagesAsRead?: (messageIds: string[]) => void;
  unreadCount?: number;
  /** Подсказка для сценария expand до загрузки ленты (обычно max-счётчик из шапки/WS). */
  expandUnreadHintCount?: number;
  scrollToBottomOnExpand?: boolean;
  onScrollToBottomDone?: () => void;
  dialogStatus?: string;
  isDialogBlockedByOtherOperator?: boolean;
  isDialogEnded?: boolean;
}

/** Как relaxed в updateSessionUnreadCount: входящие не READ, не только SENT/DELIVERED — иначе скролл к первому не срабатывает. */
function isInboundUnreadForExpandScroll(msg: any): boolean {
  return (
    msg.messageStatus === 'TO_OPERATOR' &&
    !msg.is_read &&
    String(msg.confirmStatus ?? '').toUpperCase() !== 'READ'
  );
}

function resolveFeedDialogIdFromSession(session: any, allMessages: any[]): string | null {
  let id =
    session?.selectedDialog?.id && String(session.selectedDialog.id) !== '0'
      ? String(session.selectedDialog.id)
      : session?.assignedDialogId &&
          String(session.assignedDialogId) !== '0' &&
          String(session.assignedDialogId) !== 'assigned'
        ? String(session.assignedDialogId)
        : null;
  if (id == null && Array.isArray(allMessages) && allMessages.length > 0) {
    const m = allMessages.find((x: any) => x.dialogId != null || x.dialog?.id != null);
    if (m) id = String(m.dialogId ?? m.dialog?.id ?? '');
  }
  return id && id !== '' ? id : null;
}

function parseMessageTimeMs(msg: any): number {
  const raw = msg?.created_at ?? msg?.createdAt ?? null;
  if (!raw) return Number.POSITIVE_INFINITY;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function MessageFeed({
  sessionId,
  messages,
  onReplyToMessage,
  onDeleteMessage,
  onEditMessage,
  attachments = [],
  onRemoveAttachment,
  selectedUserName,
  onMarkMessagesAsRead,
  unreadCount: externalUnreadCount,
  expandUnreadHintCount = 0,
  scrollToBottomOnExpand,
  onScrollToBottomDone,
  dialogStatus = '',
  isDialogBlockedByOtherOperator = false,
  isDialogEnded = false,
}: MessageFeedProps) {
  const { t } = useTranslation();
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(false);
  const [deletedMessages, setDeletedMessages] = useState<Set<string>>(new Set());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [internalUnreadCount, setInternalUnreadCount] = useState<number>(0);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);
  const visibleMessagesIds = useRef<Set<string>>(new Set());
  const sentReadStatusesRef = useRef<Set<string>>(new Set());

  const readSentTrackingKeys = useCallback((msg: any): string[] => {
    const keys: string[] = [];
    if (msg?.uuid != null && String(msg.uuid).trim() !== '') keys.push(String(msg.uuid));
    if (msg?.id != null) keys.push(String(msg.id));
    return keys;
  }, []);
  const firstUnreadMessageRef = useRef<{ id: string; index: number } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const needsScrollToBottomRef = useRef(false);
  /** Сценарий после expand: держим специальную логику скролла активной, даже если проп уже стал false. */
  const expandScrollPendingRef = useRef(false);
  /** Раскрытие окна при непрочитанных входящих: прокрутка к первому непрочитанному вместо низа. */
  const needsScrollToFirstUnreadRef = useRef(false);
  /** Блокирует принудительный скролл вниз после раскрытия с непрочитанными (layout/messagesJustLoaded/load). */
  const suppressBottomScrollAfterExpandUnreadRef = useRef(false);
  const scrollDoneCallbackRef = useRef<(() => void) | undefined>(undefined);
  const prevMessageLenRef = useRef(messages.length);

  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPositionRef = useRef<number>(0);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const scrollTriggerHistoryRef = useRef<{ up: boolean; down: boolean }>({
    up: false,
    down: false,
  });

  const {
    getSession,
    loadPreviousMessages,
    loadNextMessages,
    navigateToQuotedMessage,
    loadFirstPageMessages,
  } = useChat();
  const loadingMoreRef = useRef(false);
  const loadingNextRef = useRef(false);
  const loadFirstPageRef = useRef(false);

  const scrollHeightBeforeLoadRef = useRef<number>(0);
  const firstVisibleMessageIdRef = useRef<string | null>(null);

  const isLoadInProgressRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);

  const session = getSession(sessionId);
  const pagination = session?.pagination;

  /** Как в MessageInput: ответ/редактирование только если диалог «забран» и можно писать. */
  const canInteractWithMessages =
    dialogStatus === 'CLOSED' && !isDialogBlockedByOtherOperator && !isDialogEnded;

  const feedDialogId = useMemo(
    () => resolveFeedDialogIdFromSession(session, messages),
    [session, messages],
  );

  /** Не показывать в основной ленте сообщения «чужих» диалогов (превью в той же сессии). */
  const messagesInActiveDialog = useMemo(() => {
    if (!feedDialogId) return [];
    return messages.filter((msg) => String(msg.dialogId ?? msg.dialog?.id ?? '') === feedDialogId);
  }, [messages, feedDialogId]);
  const hasUnreadOnExpandHint =
    !!scrollToBottomOnExpand &&
    (expandUnreadHintCount > 0 || messagesInActiveDialog.some(isInboundUnreadForExpandScroll));

  const calculateUnreadMessages = useCallback(() => {
    let count = 0;
    for (let i = messagesInActiveDialog.length - 1; i >= 0; i--) {
      const msg = messagesInActiveDialog[i];

      if (
        msg.messageStatus === 'TO_OPERATOR' &&
        (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
        !msg.is_read
      ) {
        count++;
      }

      if (lastSeenMessageId && msg.id === lastSeenMessageId) {
        break;
      }
    }

    return count;
  }, [messagesInActiveDialog, lastSeenMessageId]);

  const sendReadStatusForVisibleMessages = useCallback(() => {
    if (!onMarkMessagesAsRead) {
      return;
    }
    // Пока не завершили позиционирование после раскрытия с непрочитанными,
    // не отправляем READ по видимости: это преждевременно помечает "хвост" как прочитанный.
    if (expandScrollPendingRef.current || needsScrollToFirstUnreadRef.current) {
      return;
    }

    if (visibleMessagesIds.current.size === 0) {
      return;
    }

    const messagesToMarkAsRead: string[] = [];

    messagesInActiveDialog.forEach((msg) => {
      const messageIdentifier = msg.id ? String(msg.id) : null;
      const trackKeys = readSentTrackingKeys(msg);
      const callbackId =
        msg.uuid != null && String(msg.uuid).trim() !== ''
          ? String(msg.uuid)
          : msg.id != null
            ? String(msg.id)
            : '';

      if (!callbackId) return;

      const isVisible = messageIdentifier
        ? visibleMessagesIds.current.has(messageIdentifier)
        : msg.uuid
          ? visibleMessagesIds.current.has(String(msg.uuid))
          : false;
      const alreadySent = trackKeys.some((k) => sentReadStatusesRef.current.has(k));

      const canSendRead =
        (msg.confirmStatus === 'DELIVERED' || msg.confirmStatus === 'SENT') && !alreadySent;
      const shouldSend = isVisible && msg.messageStatus === 'TO_OPERATOR' && canSendRead;

      if (shouldSend) {
        messagesToMarkAsRead.push(callbackId);
        trackKeys.forEach((k) => sentReadStatusesRef.current.add(k));
      }
    });

    if (messagesToMarkAsRead.length > 0) {
      operatorUnreadDebug('Отправка READ по видимости ленты', {
        sessionId,
        dialogId: feedDialogId,
        ids: messagesToMarkAsRead,
      });
      messagesToMarkAsRead.forEach((messageId, index) => {
        setTimeout(() => {
          onMarkMessagesAsRead([messageId]);
        }, index * 500);
      });
    }
  }, [messagesInActiveDialog, onMarkMessagesAsRead, sessionId, feedDialogId, readSentTrackingKeys]);

  useEffect(() => {
    const count = calculateUnreadMessages();
    setInternalUnreadCount(count);
  }, [messages, calculateUnreadMessages]);

  const unreadCount = externalUnreadCount !== undefined ? externalUnreadCount : internalUnreadCount;

  const messagesJustLoaded = messages.length > 0 && prevMessageLenRef.current === 0;
  prevMessageLenRef.current = messages.length;

  useEffect(() => {
    if (scrollToBottomOnExpand) {
      expandScrollPendingRef.current = true;
      const hasUnreadInboundInFeed = messagesInActiveDialog.some(isInboundUnreadForExpandScroll);
      const hasUnreadHintFromBadge = expandUnreadHintCount > 0;
      const shouldScrollToFirstUnread = hasUnreadInboundInFeed || hasUnreadHintFromBadge;

      needsScrollToFirstUnreadRef.current = shouldScrollToFirstUnread;
      // Важный момент: пока лента после expand ещё пустая, нельзя заранее ставить скролл вниз.
      // Иначе после прихода history это перехватывает фокус и уводит к нижнему сообщению.
      needsScrollToBottomRef.current =
        !shouldScrollToFirstUnread && messagesInActiveDialog.length > 0;

      if (shouldScrollToFirstUnread) {
        suppressBottomScrollAfterExpandUnreadRef.current = true;
        // Принудительно убираем возможный "унаследованный" низ от предыдущего состояния
        // до того, как начнётся закрепление на первом непрочитанном.
        if (scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }
        operatorUnreadDebug('Раскрытие с непрочитанными: включаем блокировку автоскролла вниз', {
          sessionId,
          feedDialogId,
          непрочитанныхВЛенте: messagesInActiveDialog.filter(isInboundUnreadForExpandScroll).length,
          подсказкаИзБейджа: hasUnreadHintFromBadge,
        });
      }
      return;
    }

    if (
      ((messages.length > 0 && isInitialLoad) || messagesJustLoaded) &&
      !suppressBottomScrollAfterExpandUnreadRef.current &&
      !expandScrollPendingRef.current
    ) {
      needsScrollToFirstUnreadRef.current = false;
      needsScrollToBottomRef.current = true;
    }
  }, [
    scrollToBottomOnExpand,
    messagesInActiveDialog,
    expandUnreadHintCount,
    sessionId,
    feedDialogId,
    messages.length,
    isInitialLoad,
    messagesJustLoaded,
  ]);

  useEffect(() => {
    scrollDoneCallbackRef.current = onScrollToBottomDone;
  });

  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      setIsInitialLoad(false);
      if (
        !needsScrollToFirstUnreadRef.current &&
        !hasUnreadOnExpandHint &&
        !suppressBottomScrollAfterExpandUnreadRef.current
      ) {
        needsScrollToBottomRef.current = true;
      }

      const lastReadMessage = [...messages]
        .reverse()
        .find((msg) => msg.messageStatus === 'TO_OPERATOR' && msg.confirmStatus === 'READ');

      if (lastReadMessage) {
        setLastSeenMessageId(lastReadMessage.id);
      } else if (messagesInActiveDialog.length > 0) {
        setLastSeenMessageId(messagesInActiveDialog[messagesInActiveDialog.length - 1].id);
      }

      let firstUnreadIndex = -1;

      for (let i = 0; i < messagesInActiveDialog.length; i++) {
        const msg = messagesInActiveDialog[i];
        if (
          msg.messageStatus === 'TO_OPERATOR' &&
          (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
          !msg.is_read
        ) {
          firstUnreadIndex = i;
          break;
        }
      }

      if (firstUnreadIndex >= 0) {
        const um = messagesInActiveDialog[firstUnreadIndex];
        firstUnreadMessageRef.current = {
          id: String(um.id ?? um.uuid ?? firstUnreadIndex),
          index: firstUnreadIndex,
        };
      } else {
        firstUnreadMessageRef.current = null;
      }
    }
  }, [messages, messagesInActiveDialog, isInitialLoad, hasUnreadOnExpandHint]);

  useLayoutEffect(() => {
    if (hasUnreadOnExpandHint) return;
    if (suppressBottomScrollAfterExpandUnreadRef.current) return;
    if (expandScrollPendingRef.current) return;
    if (needsScrollToFirstUnreadRef.current) return;
    if (!needsScrollToBottomRef.current) return;
    const container = scrollRef.current;
    if (!container || messages.length === 0) return;
    container.scrollTop = container.scrollHeight;
  }, [hasUnreadOnExpandHint, messages.length]);

  const getFirstVisibleMessageId = useCallback((): string | null => {
    if (!scrollRef.current || messages.length === 0) return null;

    const container = scrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const messagesElements = container.querySelectorAll('[id^="message-"]');

    for (let i = 0; i < messagesElements.length; i++) {
      const element = messagesElements[i];
      const rect = element.getBoundingClientRect();

      if (rect.top >= containerRect.top && rect.bottom <= containerRect.bottom) {
        const messageId = element.id.replace('message-', '');
        return messageId || null;
      }
    }

    for (let i = 0; i < messagesElements.length; i++) {
      const element = messagesElements[i];
      const rect = element.getBoundingClientRect();

      if (rect.top >= containerRect.top && rect.top <= containerRect.bottom) {
        const messageId = element.id.replace('message-', '');
        return messageId || null;
      }
    }

    return null;
  }, [messages]);

  const saveScrollState = useCallback(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    scrollHeightBeforeLoadRef.current = container.scrollHeight;
    firstVisibleMessageIdRef.current = getFirstVisibleMessageId();
  }, [getFirstVisibleMessageId]);

  const restoreScrollPosition = useCallback(() => {
    if (
      !scrollRef.current ||
      !scrollHeightBeforeLoadRef.current ||
      !firstVisibleMessageIdRef.current
    ) {
      return;
    }

    const container = scrollRef.current;
    const newScrollHeight = container.scrollHeight;
    const heightDifference = newScrollHeight - scrollHeightBeforeLoadRef.current;

    if (heightDifference > 0 && firstVisibleMessageIdRef.current) {
      const targetElement = document.getElementById(`message-${firstVisibleMessageIdRef.current}`);

      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ block: 'start', behavior: 'auto' });
        }, 50);
      } else {
        setTimeout(() => {
          container.scrollTop = container.scrollTop + heightDifference;
        }, 50);
      }
    }

    scrollHeightBeforeLoadRef.current = 0;
    firstVisibleMessageIdRef.current = null;
  }, []);

  const updateVisibleMessages = useCallback(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const messagesElements = container.querySelectorAll('[id^="message-"]');
    const newVisibleIds = new Set<string>();

    const containerRect = container.getBoundingClientRect();

    messagesElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const messageIdAttr = element.getAttribute('data-message-id');

      const messageIdentifier = messageIdAttr;
      const messageUuid = !messageIdAttr ? element.getAttribute('data-message-uuid') : null;

      const isVisible = rect.top < containerRect.bottom && rect.bottom > containerRect.top;

      if (isVisible) {
        if (messageIdentifier) {
          newVisibleIds.add(messageIdentifier);
        } else if (messageUuid) {
          newVisibleIds.add(messageUuid);
        }
      }
    });

    visibleMessagesIds.current = newVisibleIds;
  }, []);

  const handleLoadPreviousMessages = useCallback(async () => {
    if (isLoadInProgressRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastLoadTimeRef.current < 500) {
      return;
    }

    if (!pagination?.hasMoreMessages || pagination?.isLoadingMore || loadingMoreRef.current) {
      return;
    }

    saveScrollState();

    isLoadInProgressRef.current = true;
    lastLoadTimeRef.current = now;
    loadingMoreRef.current = true;

    try {
      await loadPreviousMessages(sessionId);
    } catch (error) {
      console.error('❌ Ошибка загрузки предыдущих сообщений:', error);
    } finally {
      setTimeout(() => {
        isLoadInProgressRef.current = false;
      }, 1000);
    }
  }, [pagination, sessionId, loadPreviousMessages, saveScrollState]);

  const handleLoadNextMessages = useCallback(async () => {
    if (isLoadInProgressRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastLoadTimeRef.current < 500) {
      return;
    }

    if (!pagination?.hasNextMessages || pagination?.isLoadingNext || loadingNextRef.current) {
      return;
    }

    saveScrollState();

    isLoadInProgressRef.current = true;
    lastLoadTimeRef.current = now;
    loadingNextRef.current = true;

    try {
      await loadNextMessages(sessionId);
    } catch (error) {
      console.error('❌ Ошибка загрузки следующих сообщений:', error);
    } finally {
      setTimeout(() => {
        isLoadInProgressRef.current = false;
      }, 1000);
    }
  }, [pagination, sessionId, loadNextMessages, saveScrollState]);

  const handleLoadFirstPage = useCallback(async () => {
    if (isLoadInProgressRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastLoadTimeRef.current < 500) {
      return;
    }

    if (!session?.selectedDialog?.id || session.selectedDialog.id === '0') {
      return;
    }

    isLoadInProgressRef.current = true;
    lastLoadTimeRef.current = now;
    loadFirstPageRef.current = true;

    try {
      await loadFirstPageMessages(sessionId, session.selectedDialog.id);
    } catch (error) {
      console.error('❌ Ошибка загрузки первой страницы:', error);
    } finally {
      setTimeout(() => {
        isLoadInProgressRef.current = false;
        loadFirstPageRef.current = false;

        setTimeout(() => {
          const container = scrollRef.current;
          if (!container) return;
          if (
            suppressBottomScrollAfterExpandUnreadRef.current ||
            needsScrollToFirstUnreadRef.current
          ) {
            return;
          }
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
          });
          setIsAtBottom(true);
          setIsAtTop(false);

          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            setLastSeenMessageId(lastMessage.id);
            setInternalUnreadCount(0);
          }
        }, 200);
      }, 1000);
    }
  }, [sessionId, session?.selectedDialog?.id, loadFirstPageMessages, messages]);

  useEffect(() => {
    if (messages.length === 0) return;

    if (loadingMoreRef.current) {
      setTimeout(() => {
        restoreScrollPosition();

        setTimeout(() => {
          loadingMoreRef.current = false;
        }, 100);
      }, 100);
    }

    if (loadingNextRef.current || loadFirstPageRef.current) {
      setTimeout(() => {
        loadingNextRef.current = false;
        loadFirstPageRef.current = false;
      }, 100);
    }
  }, [messages, restoreScrollPosition]);

  const handleScroll = useCallback(() => {
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }

    scrollDebounceRef.current = setTimeout(() => {
      if (!scrollRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

      const currentScrollTop = scrollTop;
      if (lastScrollPositionRef.current !== null) {
        scrollDirectionRef.current =
          currentScrollTop > lastScrollPositionRef.current ? 'down' : 'up';
      }
      lastScrollPositionRef.current = currentScrollTop;

      const isBottom = scrollHeight - scrollTop - clientHeight < 100;
      const isTop = scrollTop < 100;

      setIsAtBottom(isBottom);
      setIsAtTop(isTop);

      updateVisibleMessages();

      const shouldShowButton = !isBottom;
      setShowScrollButton(shouldShowButton);
      if (isTop && scrollDirectionRef.current === 'up') {
        if (!scrollTriggerHistoryRef.current.up) {
          if (
            pagination?.hasMoreMessages &&
            !pagination?.isLoadingMore &&
            !loadingMoreRef.current &&
            !isLoadInProgressRef.current
          ) {
            scrollTriggerHistoryRef.current.up = true;
            scrollTriggerHistoryRef.current.down = false;
            handleLoadPreviousMessages();
          }
        }
      }

      if (isBottom && scrollDirectionRef.current === 'down') {
        if (!scrollTriggerHistoryRef.current.down) {
          if (
            pagination?.hasNextMessages &&
            !pagination?.isLoadingNext &&
            !loadingNextRef.current &&
            !isLoadInProgressRef.current
          ) {
            scrollTriggerHistoryRef.current.down = true;
            scrollTriggerHistoryRef.current.up = false;
            handleLoadNextMessages();
          }
        }
      }

      if (!isTop && !isBottom) {
        scrollTriggerHistoryRef.current.up = false;
        scrollTriggerHistoryRef.current.down = false;
      } else if (isTop && scrollDirectionRef.current === 'down') {
        scrollTriggerHistoryRef.current.up = false;
      } else if (isBottom && scrollDirectionRef.current === 'up') {
        scrollTriggerHistoryRef.current.down = false;
      }

      if (isBottom && messagesInActiveDialog.length > 0) {
        const stillUnreadInbound = messagesInActiveDialog.some(isInboundUnreadForExpandScroll);
        const lastMessage = messagesInActiveDialog[messagesInActiveDialog.length - 1];
        if (!stillUnreadInbound && lastMessage.id !== lastSeenMessageId) {
          setLastSeenMessageId(lastMessage.id);
          setInternalUnreadCount(0);
        }
        if (
          isBottom &&
          !stillUnreadInbound &&
          !needsScrollToFirstUnreadRef.current &&
          !hasUnreadOnExpandHint
        ) {
          suppressBottomScrollAfterExpandUnreadRef.current = false;
        }
      }

      sendReadStatusForVisibleMessages();
    }, 200);
  }, [
    messagesInActiveDialog,
    isAtBottom,
    isAtTop,
    pagination,
    handleLoadPreviousMessages,
    handleLoadNextMessages,
    updateVisibleMessages,
    lastSeenMessageId,
    sendReadStatusForVisibleMessages,
    hasUnreadOnExpandHint,
  ]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      setTimeout(updateVisibleMessages, 100);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, updateVisibleMessages]);

  useEffect(() => {
    sendReadStatusForVisibleMessages();
  }, [sendReadStatusForVisibleMessages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      updateVisibleMessages();
      sendReadStatusForVisibleMessages();
    }, 150);
    return () => clearTimeout(t);
  }, [messages.length, sessionId, updateVisibleMessages, sendReadStatusForVisibleMessages]);

  useEffect(() => {
    if (hasUnreadOnExpandHint) return;
    if (suppressBottomScrollAfterExpandUnreadRef.current) return;
    if (expandScrollPendingRef.current) return;
    if (!needsScrollToBottomRef.current || messages.length === 0) return;
    if (needsScrollToFirstUnreadRef.current) return;

    let stopped = false;
    let attempts = 0;
    const maxAttempts = 120;

    const tryScroll = () => {
      if (stopped) return;
      const c = scrollRef.current;
      if (!c) return;

      c.scrollTop = c.scrollHeight;

      attempts++;
      const isAtBot = c.scrollHeight - c.scrollTop - c.clientHeight < 5;
      const hasContent = c.scrollHeight > c.clientHeight + 10;

      if ((isAtBot && hasContent) || attempts >= maxAttempts) {
        stopped = true;
        needsScrollToBottomRef.current = false;
        setIsAtBottom(true);
        setIsAtTop(false);
        scrollDoneCallbackRef.current?.();
      }
    };

    const intervalId = setInterval(tryScroll, 50);
    tryScroll();

    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [messages, hasUnreadOnExpandHint]);

  /** Раскрытие минимизированного окна: непрочитанные входящие — к первому, без массового READ. */
  useEffect(() => {
    // Важно: иногда флаг needsScrollToFirstUnreadRef сбрасывается раньше, чем история успевает прийти.
    // suppressBottomScrollAfterExpandUnreadRef — более «долгоживущий» сигнал сценария expand с непрочитанными.
    if (
      (!needsScrollToFirstUnreadRef.current &&
        !suppressBottomScrollAfterExpandUnreadRef.current &&
        !expandScrollPendingRef.current) ||
      messagesInActiveDialog.length === 0
    ) {
      return;
    }
    if (!needsScrollToFirstUnreadRef.current && suppressBottomScrollAfterExpandUnreadRef.current) {
      needsScrollToFirstUnreadRef.current = true;
    }

    /** Самое раннее по времени непрочитанное входящее (порядок массива может расходиться с ответом API). */
    const findFirstUnreadInbound = () => {
      let best: { msg: (typeof messagesInActiveDialog)[0]; i: number } | null = null;
      let bestTime = Infinity;
      let bestIdNum = Infinity;
      for (let i = 0; i < messagesInActiveDialog.length; i++) {
        const msg = messagesInActiveDialog[i];
        if (isInboundUnreadForExpandScroll(msg)) {
          const tt = parseMessageTimeMs(msg);
          const idNum = Number(msg.id);
          const idKey = Number.isFinite(idNum) ? idNum : Infinity;
          const betterTime = tt < bestTime;
          const sameTimeEarlierId =
            tt === bestTime && (idKey < bestIdNum || (idKey === bestIdNum && i < best!.i));
          if (best === null || betterTime || sameTimeEarlierId) {
            bestTime = tt;
            bestIdNum = idKey;
            best = { msg, i };
          }
        }
      }
      return best;
    };

    let stopped = false;
    let attempts = 0;
    const maxAttempts = 30;
    const poller: { id: ReturnType<typeof setInterval> | null } = { id: null };

    const clearPoller = () => {
      if (poller.id !== null) {
        clearInterval(poller.id);
        poller.id = null;
      }
    };

    const tryScrollFirstUnread = () => {
      if (stopped) return;
      if (!needsScrollToFirstUnreadRef.current) {
        stopped = true;
        clearPoller();
        return;
      }
      const c = scrollRef.current;
      if (!c) return;

      const found = findFirstUnreadInbound();
      if (!found) {
        stopped = true;
        needsScrollToFirstUnreadRef.current = false;
        needsScrollToBottomRef.current = false;
        expandScrollPendingRef.current = false;
        scrollDoneCallbackRef.current?.();
        clearPoller();
        operatorUnreadDebug('Первый непрочитанный не найден — без fallback вниз', {
          sessionId,
          dialogId: feedDialogId,
        });
        return;
      }

      const domId = `message-${found.msg.id || found.msg.uuid || found.i}`;
      const candidates = Array.from(c.querySelectorAll('[id^="message-"]')) as HTMLElement[];
      const elById = candidates.find((node) => node.id === domId) ?? null;
      const elByData = candidates.find((node) => {
        const dataId = node.getAttribute('data-message-id');
        const dataUuid = node.getAttribute('data-message-uuid');
        return (
          String(dataId ?? '') === String(found.msg.id ?? '') ||
          String(dataUuid ?? '') === String(found.msg.uuid ?? '')
        );
      });
      const elByIndex = found.i >= 0 && found.i < candidates.length ? candidates[found.i] : null;
      const el = elById ?? elByData ?? elByIndex ?? null;
      if (el) {
        const unreadCandidates = messagesInActiveDialog
          .map((m, idx) => ({ m, idx }))
          .filter(({ m }) => isInboundUnreadForExpandScroll(m))
          .map(({ m, idx }, ord) => ({
            порядокНепрочитанного: ord + 1,
            uiИндекс: idx,
            id: String(m.id ?? ''),
            uuid: String(m.uuid ?? ''),
            confirmStatus: m.confirmStatus,
            text: String(m.text ?? '').slice(0, 40),
            created_at: m.created_at ?? m.createdAt,
          }));
        // Нижний край первого непрочитанного совмещаем с низом вьюпорта: более новые сообщения (2…7) ниже — их смотрим скроллом вниз.
        const cRect = c.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const deltaBottom = elRect.bottom - cRect.bottom;
        const nextTop = Math.max(0, c.scrollTop + deltaBottom + 8);
        c.scrollTop = nextTop;
        stopped = true;
        needsScrollToFirstUnreadRef.current = false;
        expandScrollPendingRef.current = false;
        firstUnreadMessageRef.current = {
          id: String(found.msg.id ?? found.msg.uuid ?? found.i),
          index: found.i,
        };
        setIsAtBottom(false);
        setIsAtTop(false);
        scrollDoneCallbackRef.current?.();
        clearPoller();
        const c2 = scrollRef.current;
        operatorUnreadDebug('Скролл при раскрытии: закреплено первое непрочитанное', {
          sessionId,
          dialogId: feedDialogId,
          domId,
          индексВЛенте: found.i,
          текст: String(found.msg.text ?? '').slice(0, 80),
          confirmStatus: found.msg.confirmStatus,
          is_read: found.msg.is_read,
          created_at: found.msg.created_at ?? found.msg.createdAt,
          scrollTop: c2?.scrollTop,
          scrollHeight: c2?.scrollHeight,
          clientHeight: c2?.clientHeight,
          выбранныйПорядокНепрочитанного: unreadCandidates.find(
            (x) => x.id === String(found.msg.id ?? ''),
          )?.порядокНепрочитанного,
          непрочитанныеКандидаты: unreadCandidates,
          блокировкаДнаДоПрокруткиОператором: true,
        });
        setTimeout(() => {
          updateVisibleMessages();
          sendReadStatusForVisibleMessages();
        }, 50);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        stopped = true;
        needsScrollToFirstUnreadRef.current = false;
        needsScrollToBottomRef.current = false;
        expandScrollPendingRef.current = false;
        setIsAtBottom(false);
        scrollDoneCallbackRef.current?.();
        clearPoller();
        operatorUnreadDebug('Первый непрочитанный: DOM не найден, позицию не меняем', {
          sessionId,
          domId,
          попыток: attempts,
        });
      }
    };

    poller.id = setInterval(tryScrollFirstUnread, 50);
    tryScrollFirstUnread();
    return () => {
      stopped = true;
      clearPoller();
    };
  }, [
    messages,
    messagesInActiveDialog,
    updateVisibleMessages,
    sendReadStatusForVisibleMessages,
    sessionId,
    feedDialogId,
  ]);

  useEffect(() => {
    suppressBottomScrollAfterExpandUnreadRef.current = false;
    expandScrollPendingRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!feedDialogId) return;
    const rows = messagesInActiveDialog.filter(isInboundUnreadForExpandScroll).map((m: any) => ({
      id: String(m.id ?? m.uuid ?? ''),
      confirmStatus: m.confirmStatus,
      is_read: m.is_read,
      фрагментТекста: String(m.text ?? '').slice(0, 60),
      created_at: m.created_at,
    }));
    operatorUnreadDebug('Снимок непрочитанных входящих в активной ленте', {
      sessionId,
      dialogId: feedDialogId,
      количество: rows.length,
      сообщения: rows,
    });
  }, [messagesInActiveDialog, sessionId, feedDialogId]);

  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, []);

  const scrollToBottom = (forceLoadFirstPage: boolean = false) => {
    suppressBottomScrollAfterExpandUnreadRef.current = false;
    const session = getSession(sessionId);
    const dialogId = session?.selectedDialog?.id;

    if (forceLoadFirstPage || (dialogId && dialogId !== '0' && pagination?.currentPage !== 0)) {
      handleLoadFirstPage();
    } else {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });

        if (messagesInActiveDialog.length > 0) {
          const lastMessage = messagesInActiveDialog[messagesInActiveDialog.length - 1];
          setLastSeenMessageId(lastMessage.id);
          setInternalUnreadCount(0);
        }

        setIsAtBottom(true);
        setIsAtTop(false);
      }
    }
  };

  const handleReplyClick = (message: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReplyToMessage) {
      onReplyToMessage(message);
    }
  };

  const handleDeleteClick = (message: any, e: React.MouseEvent) => {
    e.stopPropagation();

    if (message.id && canEditOrDelete(message)) {
      setDeletedMessages((prev) => {
        const newSet = new Set(prev);
        newSet.add(message.id);
        return newSet;
      });

      if (onDeleteMessage) {
        onDeleteMessage(message.id);
      }
    }
  };

  const handleEditClick = (message: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.id && message.sender === 'user' && canEditOrDelete(message)) {
      setEditingMessageId(message.id);
      setEditText(message.text || '');
    }
  };

  const handleSaveEdit = (messageId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const message = messages.find((m) => m.id === messageId);
    if (onEditMessage && editText.trim() && message && canEditOrDelete(message)) {
      onEditMessage(messageId, editText.trim());
      setEditingMessageId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingMessageId(null);
    setEditText('');
  };

  const findOriginalMessage = (replyToId: string) => {
    const message = messages.find((m) => m.id === replyToId || m.uuid === replyToId);
    if (!message) {
      for (const msg of messages) {
        if (
          msg.replyToMessage &&
          (msg.replyToMessage.id === replyToId || msg.replyToMessage.uuid === replyToId)
        ) {
          return msg.replyToMessage;
        }
      }
    }

    return message;
  };

  const handleQuoteClick = useCallback(
    async (quoteMessage: any, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!quoteMessage) return;

      const session = getSession(sessionId);
      if (!session || !session.selectedDialog?.id) return;

      const dialogId = session.selectedDialog.id;
      const messageCreatedAt = quoteMessage.created_at || quoteMessage.createdAt;

      if (!messageCreatedAt) {
        console.error('❌ Нет поля created_at в цитируемом сообщении:', {
          messageId: quoteMessage.id,
          messageUuid: quoteMessage.uuid,
          availableKeys: Object.keys(quoteMessage),
        });
        return;
      }

      try {
        await navigateToQuotedMessage(sessionId, dialogId, quoteMessage, 50);
      } catch (error) {
        console.error('❌ Ошибка навигации к цитируемому сообщению:', error);
      }
    },
    [sessionId, getSession, navigateToQuotedMessage],
  );

  const canEditOrDelete = (message: any): boolean => {
    if (!message.created_at) return false;

    try {
      const messageTime = dayjs(message.created_at);
      const now = dayjs();
      const minutesDiff = now.diff(messageTime, 'minute');

      return minutesDiff < 1;
    } catch (error) {
      console.error('Error calculating time difference:', error);
      return false;
    }
  };

  const handleRemoveAttachment = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (onRemoveAttachment) {
      onRemoveAttachment(index);
    }
  };

  const getSenderName = (message: any): string => {
    if (message.messageStatus === 'TO_USER') {
      return (
        message.senderInfo?.fullName ||
        message.senderInfo?.displayName ||
        message.createdBy?.fullName ||
        'Вы'
      );
    } else if (message.messageStatus === 'TO_OPERATOR') {
      return (
        message.senderInfo?.fullName ||
        message.senderInfo?.displayName ||
        message.createdBy?.fullName ||
        selectedUserName ||
        'Клиент'
      );
    }

    return message.sender === 'user'
      ? message.senderInfo?.fullName || message.senderInfo?.displayName || 'Вы'
      : selectedUserName || 'Клиент';
  };

  const getMessageStyle = (message: any) => {
    if (message.messageStatus === 'TO_USER') {
      return styles.supportMessage;
    } else if (message.messageStatus === 'TO_OPERATOR') {
      return styles.userMessage;
    }

    return message.sender === 'user' ? styles.supportMessage : styles.userMessage;
  };

  const getStatusIcon = (message: any) => {
    if (message.messageStatus === 'TO_USER') {
      if (message.confirmStatus === 'READ') {
        return <BsCheck2All className={styles.delivered} title={t('chat.statusRead')} />;
      } else if (message.confirmStatus === 'DELIVERED') {
        return <BsCheck2All className={styles.sent} title={t('chat.statusDelivered')} />;
      } else if (message.confirmStatus === 'SENT') {
        return <BsCheck2 className={styles.sent} title={t('chat.statusSent')} />;
      } else {
        return <BsCheck2 className={styles.sent} title={t('chat.statusSent')} />;
      }
    }
    return null;
  };

  const lastMessagesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!session || !pagination) return;

    const currentPage = pagination.currentPage || 0;
    const prevMessages = lastMessagesRef.current;
    const currentMessages = messagesInActiveDialog;

    if (currentMessages.length > prevMessages.length) {
      const newMessages = currentMessages.slice(prevMessages.length);
      const hasNewOperatorMessage = newMessages.some(
        (msg) => msg.messageStatus === 'TO_USER' && msg.confirmStatus === 'SENT',
      );

      if (hasNewOperatorMessage) {
        if (currentPage > 0) {
          handleLoadFirstPage();
        } else {
          setTimeout(() => {
            if (scrollRef.current) {
              const container = scrollRef.current;
              const isAtBottomNow =
                container.scrollHeight - container.scrollTop - container.clientHeight < 50;

              if (!isAtBottomNow) {
                container.scrollTo({
                  top: container.scrollHeight,
                  behavior: 'smooth',
                });
              } else {
                container.scrollTop = container.scrollHeight;
              }

              if (currentMessages.length > 0) {
                const lastMessage = currentMessages[currentMessages.length - 1];
                setLastSeenMessageId(lastMessage.id);
                setInternalUnreadCount(0);
              }

              setIsAtBottom(true);
              setIsAtTop(false);
            }
          }, 50);
        }
      }
    }

    lastMessagesRef.current = [...currentMessages];
  }, [messagesInActiveDialog, session, pagination, handleLoadFirstPage]);

  useEffect(() => {
    messages.forEach((msg) => {
      const isRead = String(msg.confirmStatus ?? '').toUpperCase() === 'READ' || msg.is_read;
      if (!isRead) return;
      readSentTrackingKeys(msg).forEach((k) => sentReadStatusesRef.current.delete(k));
    });
  }, [messages, readSentTrackingKeys]);

  return (
    <>
      <div
        ref={scrollRef}
        className={styles.feed}
        onScroll={handleScroll}
        data-session-id={sessionId}>
        {pagination?.isLoadingMore && (
          <div className={styles.loadingIndicator}>
            <CircularProgress size={20} />
            <p>Загрузка более старых сообщений...</p>
          </div>
        )}

        {messagesInActiveDialog.map((msg, index) => {
          const originalMessage = msg.replyTo
            ? findOriginalMessage(msg.replyTo)
            : msg.replyToMessage;

          const isDeleted = msg.id && deletedMessages.has(msg.id);
          const isEditing = msg.id === editingMessageId;
          const isOperatorMessage = msg.messageStatus === 'TO_USER';
          const canEditDelete = canEditOrDelete(msg) && canInteractWithMessages;
          const showReplyControl = canInteractWithMessages && !!onReplyToMessage;
          const showEditDeleteBar = canEditDelete;
          const showMessageActionsRow = showReplyControl || showEditDeleteBar;
          const senderName = getSenderName(msg);
          const messageStyle = getMessageStyle(msg);
          const statusIcon = getStatusIcon(msg);
          const isUnread =
            msg.messageStatus === 'TO_OPERATOR' &&
            (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
            !msg.is_read &&
            (!lastSeenMessageId ||
              messagesInActiveDialog.findIndex((m) => m.id === msg.id) >
                messagesInActiveDialog.findIndex((m) => m.id === lastSeenMessageId));

          const isFirstUnread =
            msg.messageStatus === 'TO_OPERATOR' &&
            (msg.confirmStatus === 'SENT' || msg.confirmStatus === 'DELIVERED') &&
            !msg.is_read &&
            firstUnreadMessageRef.current?.id === String(msg.id ?? msg.uuid ?? index);

          const messageKey = msg.id || msg.uuid || `index-${index}`;

          return (
            <div
              key={messageKey}
              id={`message-${msg.id || msg.uuid || index}`}
              data-message-uuid={msg.uuid}
              data-message-id={msg.id}
              className={`${styles.message} ${messageStyle} ${isDeleted ? styles.deletedMessage : ''} ${isUnread ? styles.unreadMessage : ''} ${isFirstUnread ? styles.firstUnreadMessage : ''}`}>
              <div className={styles.senderName}>{senderName}</div>

              {!isDeleted && (msg.replyTo || msg.replyToMessage) && originalMessage && (
                <div
                  className={styles.replyIndicator}
                  onClick={(e) => handleQuoteClick(originalMessage, e)}
                  style={{ cursor: 'pointer' }}
                  title={t('chat.jumpToQuotedMessage')}>
                  <div className={styles.replyAuthor}>
                    Ответ на{' '}
                    {originalMessage.messageStatus === 'TO_USER'
                      ? 'сообщение пользователя'
                      : 'ваше сообщение'}
                  </div>
                  <div className={styles.replyText}>
                    {originalMessage.text?.substring(0, 50) || 'Сообщение'}
                    {originalMessage.text?.length > 50 ? '...' : ''}
                  </div>
                </div>
              )}

              {!isDeleted && msg.text && !isEditing && (
                <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 4px 0', wordWrap: 'break-word' }}>
                  {msg.text}
                </p>
              )}

              {!isDeleted && isEditing && (
                <div style={{ marginBottom: '8px' }}>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={(e) => handleSaveEdit(msg.id, e)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}>
                      {t('common.save')}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#999',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {!isDeleted && msg.attachments && msg.attachments.length > 0 && (
                <div style={{ margin: '4px 0' }}>
                  {msg.attachments.map((attachment: any, attIndex: number) => {
                    const isImage =
                      attachment.type === 'image' ||
                      (attachment.extension &&
                        ['jpg', 'jpeg', 'png', 'bmp', 'gif'].includes(
                          attachment.extension.toLowerCase(),
                        )) ||
                      (attachment.name && /\.(jpg|jpeg|png|bmp|gif)$/i.test(attachment.name));

                    return (
                      <div key={attIndex} style={{ marginBottom: '8px' }}>
                        {isImage && attachment.url ? (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                              src={attachment.url}
                              alt={attachment.name || 'Вложение'}
                              style={{
                                maxWidth: '200px',
                                maxHeight: '200px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: '1px solid #ddd',
                              }}
                              onClick={() => {
                                if (attachment.url) {
                                  window.open(attachment.url, '_blank');
                                }
                              }}
                            />
                            <div
                              style={{
                                fontSize: '0.8em',
                                color: '#777',
                                marginTop: '2px',
                                wordBreak: 'break-all',
                              }}>
                              {attachment.name || attachment.fileName || 'Изображение'}
                              {attachment.size && ` (${Math.round(attachment.size / 1024)} KB)`}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={styles.attachmentPlaceholder}
                            style={{
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: '#f5f5f5',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              if (attachment.url) {
                                window.open(attachment.url, '_blank');
                              } else if (attachment.blob) {
                                const url = URL.createObjectURL(attachment.blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = attachment.name || 'file';
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                              {attachment.name || attachment.fileName || 'Файл'}
                            </p>
                            <p style={{ margin: '0', fontSize: '0.9em', color: '#777' }}>
                              {attachment.extension &&
                                `Тип: ${attachment.extension.toUpperCase()} `}
                              {attachment.size && `(${Math.round(attachment.size / 1024)} KB)`}
                              {!attachment.size &&
                                attachment.extension &&
                                ` (${attachment.extension.toUpperCase()})`}
                            </p>
                            {attachment.error && (
                              <p
                                style={{
                                  margin: '4px 0 0 0',
                                  color: '#d32f2f',
                                  fontSize: '0.8em',
                                }}>
                                Ошибка загрузки
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isDeleted && (
                <div className={styles.deletedContent}>
                  <p style={{ fontStyle: 'italic', color: '#999', margin: '0 0 4px 0' }}>
                    Сообщение удалено
                  </p>
                </div>
              )}

              <div
                style={{
                  fontSize: '0.8rem',
                  opacity: isDeleted ? 0.5 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: isDeleted ? '#999' : 'inherit',
                  flexWrap: 'wrap',
                }}>
                <span style={{ fontWeight: 'bold', color: '#777' }}>
                  {dayjs(msg.edited_at || msg.created_at).format('DD.MM.YYYY HH:mm')}
                </span>

                {msg.edited_at && (
                  <span style={{ fontStyle: 'italic', marginLeft: '4px' }}>(изменено)</span>
                )}

                {!isDeleted && statusIcon && (
                  <span className={styles.statusIcons} style={{ marginLeft: '4px' }}>
                    {statusIcon}
                  </span>
                )}
              </div>

              {!isDeleted && showMessageActionsRow && (
                <div className={styles.messageActions}>
                  {showReplyControl && (
                    <button onClick={(e) => handleReplyClick(msg, e)} title={t('chat.replyAction')}>
                      <FaReply size={12} />
                    </button>
                  )}

                  {showEditDeleteBar && (
                    <>
                      {isOperatorMessage && (
                        <button
                          onClick={(e) => handleEditClick(msg, e)}
                          title={t('common.edit')}
                          disabled={!canEditDelete}>
                          <BsPencil size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteClick(msg, e)}
                        title={t('chat.deleteMessage')}
                        disabled={!canEditDelete}>
                        <FaTrash size={12} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {pagination?.isLoadingNext && (
          <div className={styles.loadingIndicator} style={{ marginTop: '20px' }}>
            <CircularProgress size={20} />
            <p>Загрузка более новых сообщений...</p>
          </div>
        )}

        {attachments.length > 0 && (
          <div className={`${styles.message} ${styles.supportMessage}`}>
            <p style={{ margin: '0 0 8px 0', color: '#777', fontSize: '0.9em' }}>
              Прикрепленные файлы (не отправлены):
            </p>
            {attachments.map((file, index) => (
              <div key={index} className={styles.attachmentPreview}>
                {file.type.startsWith('image/') ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      style={{ maxWidth: '200px', maxHeight: '200px' }}
                    />
                    <button
                      className={styles.removeAttachment}
                      onClick={(e) => handleRemoveAttachment(index, e)}
                      title={t('chat.deleteFile')}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}>
                      <FaTimes size={12} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.attachmentPlaceholder} style={{ position: 'relative' }}>
                    <p>{file.name}</p>
                    <p>({Math.round(file.size / 1024)} KB)</p>
                    <button
                      className={styles.removeAttachment}
                      onClick={(e) => handleRemoveAttachment(index, e)}
                      title={t('chat.deleteFile')}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}>
                      <FaTimes size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showScrollButton && !isAtBottom && (
        <button
          className={styles.scrollToBottomBtn}
          onClick={() => scrollToBottom()}
          title={
            unreadCount > 0
              ? t('chat.newMessagesCount', { count: unreadCount })
              : t('chat.scrollToLastMessage')
          }>
          <BsArrowDown />
          {unreadCount > 0 && (
            <span className={styles.unreadCountBadge}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </>
  );
}

export default MessageFeed;
