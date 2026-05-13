import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import {
  Add as AddIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  OpenInBrowser as OpenInBrowserIcon,
  OpenInNew as OpenInNewIcon,
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

import { RoutePaths } from '@shared/config/routePathsEnum';
import { appStore } from '@shared/model/app_store/AppStore';

import { DialogsApi, type UnreadDialog } from '../api/dialogsApi';
import ChatPanel from '../components/ChatPanel';
import { ChatProvider, useChat } from '../contexts/ChatContext';
import { SocketProvider, useSocket } from '../contexts/SocketContext';
import { operatorUnreadDebug, unreadMapSnapshot } from '../lib/operatorUnreadDebugLog';
import { resolveSessionDialogIdForUnread } from '../lib/resolveSessionDialogIdForUnread';
import styles from './ChatFooter.module.scss';
import { type ChatFooterPanelSize, ChatFooterResizableFrame } from './ChatFooterResizableFrame';
import {
  closeOperatorChatPopupAndRestoreMain,
  openOperatorChatPopup,
} from '../chatPopup/openOperatorChatPopup';
import { chatPanelDockStorageKeys } from '../chatPopup/popupLayoutStorage';

/** Должно совпадать с медиазапросом скрытия `.minimizedChats` в ChatFooter.module.scss */
const CHAT_COMPACT_MINIMIZED_QUERY = '(max-width: 1024px)';

/** Геометрия `.chatFooter` / `ChatFooterResizableRoot`: превью левее развёрнутого окна с зазором. */
const CHAT_FOOTER_RIGHT = 80;
const CHAT_FOOTER_BOTTOM = 80;
const MINIMIZED_PREVIEW_GAP_PX = 28;
const DEFAULT_CHAT_PANEL: ChatFooterPanelSize = { w: 520, h: 660 };
const MIN_CHAT_PANEL: ChatFooterPanelSize = { w: 360, h: 320 };
const PANEL_VIEW_MARGIN_PX = 40;
/** Минимальная полоска dock остаётся в окне при перетаскивании (в т.ч. к краю второго монитора в широком окне). */
const DOCK_VISIBILITY_STRIP_PX = 48;
const DOCK_PREVIEW_ROW_APPROX_PX = 68;
/** Колонка FAB (+ и переключатель чата) справа от панели внутри dock */
const DOCK_FAB_COLUMN_W_PX = 56;
const DOCK_FAB_STACK_H_PX = 196;

function readSavedPanelSize(isOperatorChatPopup: boolean): ChatFooterPanelSize | null {
  if (typeof window === 'undefined') return null;
  const k = chatPanelDockStorageKeys(isOperatorChatPopup);
  try {
    const w = parseInt(localStorage.getItem(k.panelW) || '', 10);
    const h = parseInt(localStorage.getItem(k.panelH) || '', 10);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
    return { w, h };
  } catch {
    return null;
  }
}

function readSavedDockMargins(isOperatorChatPopup: boolean): { r: number; b: number } | null {
  if (typeof window === 'undefined') return null;
  const k = chatPanelDockStorageKeys(isOperatorChatPopup);
  try {
    const r = parseInt(localStorage.getItem(k.dockR) || '', 10);
    const b = parseInt(localStorage.getItem(k.dockB) || '', 10);
    if (!Number.isFinite(r) || !Number.isFinite(b)) return null;
    return { r, b };
  } catch {
    return null;
  }
}

function clampPanelSize(size: ChatFooterPanelSize): ChatFooterPanelSize {
  if (typeof window === 'undefined') return size;
  const maxW = Math.max(
    MIN_CHAT_PANEL.w,
    window.innerWidth - CHAT_FOOTER_RIGHT - PANEL_VIEW_MARGIN_PX,
  );
  const maxH = Math.max(
    MIN_CHAT_PANEL.h,
    window.innerHeight - CHAT_FOOTER_BOTTOM - PANEL_VIEW_MARGIN_PX,
  );
  return {
    w: Math.min(maxW, Math.max(MIN_CHAT_PANEL.w, size.w)),
    h: Math.min(maxH, Math.max(MIN_CHAT_PANEL.h, size.h)),
  };
}

/** Ширина `.chatFloatingDock` без колонки развёрнутых панелей: FAB + 2×gap + опционально колонка превью. */
function dockNonPanelWidthPx(previewCount: number): number {
  const previewColW = previewCount > 0 ? 260 : 0;
  return DOCK_FAB_COLUMN_W_PX + 2 * MINIMIZED_PREVIEW_GAP_PX + previewColW;
}

function clampPanelSizeForFloatingDock(
  size: ChatFooterPanelSize,
  args: {
    previewCount: number;
    expandedCount: number;
    dockRightPx: number;
    dockBottomPx: number;
  },
): ChatFooterPanelSize {
  if (typeof window === 'undefined') return size;
  const { previewCount, expandedCount, dockRightPx, dockBottomPx } = args;
  const nonPanelW = dockNonPanelWidthPx(previewCount);
  const maxW = Math.max(
    MIN_CHAT_PANEL.w,
    window.innerWidth - dockRightPx - PANEL_VIEW_MARGIN_PX - nonPanelW,
  );

  const maxDockH = Math.max(
    MIN_CHAT_PANEL.h,
    window.innerHeight - dockBottomPx - PANEL_VIEW_MARGIN_PX,
  );
  const previewStackH =
    previewCount > 0
      ? previewCount * DOCK_PREVIEW_ROW_APPROX_PX + (previewCount - 1) * 8
      : 0;

  let maxH = maxDockH;
  if (expandedCount > 0) {
    const sideColumnsH = Math.max(DOCK_FAB_STACK_H_PX, previewStackH);
    if (sideColumnsH <= maxDockH) {
      const maxFromPanels = (maxDockH - (expandedCount - 1) * 8) / expandedCount;
      maxH = Math.max(MIN_CHAT_PANEL.h, Math.floor(maxFromPanels));
    }
  }

  return {
    w: Math.min(maxW, Math.max(MIN_CHAT_PANEL.w, size.w)),
    h: Math.min(maxH, Math.max(MIN_CHAT_PANEL.h, size.h)),
  };
}

function getMaxPanelSizeForFloatingDock(args: {
  previewCount: number;
  expandedCount: number;
  dockRightPx: number;
  dockBottomPx: number;
}): ChatFooterPanelSize {
  if (typeof window === 'undefined') return { ...DEFAULT_CHAT_PANEL };
  return clampPanelSizeForFloatingDock({ w: 100000, h: 100000 }, args);
}

function clampDockMargins(
  r: number,
  b: number,
  dockW: number,
  dockH: number,
): { r: number; b: number } {
  if (typeof window === 'undefined') return { r, b };
  // Координаты относительно viewport окна браузера: блок не может оказаться «на другом мониторе»,
  // пока само окно браузера там не находится (перетащите окно — чат уедет вместе с ним).
  const strip = DOCK_VISIBILITY_STRIP_PX;
  const maxR = window.innerWidth - strip;
  const maxB = window.innerHeight - strip;
  const minR = -dockW + strip;
  const minB = -dockH + strip;
  return {
    r: Math.min(maxR, Math.max(minR, r)),
    b: Math.min(maxB, Math.max(minB, b)),
  };
}

function normalizeSessionDialogId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === 'assigned') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function hasRenderableMinimizedContent(session: {
  selectedUsers?: unknown[];
  selectedDialog?: { id?: unknown } | null;
  assignedDialogId?: unknown;
  messages?: unknown[];
}): boolean {
  const hasSelectedUser = (session.selectedUsers?.length ?? 0) > 0;
  const selectedDialogId = session.selectedDialog?.id;
  const hasSelectedDialogId = Boolean(
    selectedDialogId != null &&
      String(selectedDialogId) !== '' &&
      String(selectedDialogId) !== '0' &&
      String(selectedDialogId) !== 'assigned',
  );
  const assignedDialogId = session.assignedDialogId;
  const hasAssignedDialogId = Boolean(
    assignedDialogId != null &&
      String(assignedDialogId) !== '' &&
      String(assignedDialogId) !== '0' &&
      String(assignedDialogId) !== 'assigned',
  );
  const hasMessages = (session.messages?.length ?? 0) > 0;
  return hasSelectedUser || hasSelectedDialogId || hasAssignedDialogId || hasMessages;
}

/** Диалог уже открыт/привязан к какой‑либо сессии — не показывать его второй раз в превью «непрочитанных». */
function sessionListAlreadyCoversDialog(
  sessions: Array<{ selectedDialog?: { id?: unknown }; assignedDialogId?: unknown }>,
  dialogId: number,
): boolean {
  return sessions.some((session) => {
    const fromSelected = normalizeSessionDialogId(session.selectedDialog?.id);
    const fromAssigned = normalizeSessionDialogId(session.assignedDialogId);
    return fromSelected === dialogId || fromAssigned === dialogId;
  });
}

/**
 * Список непрочитанных с API кладётся в unreadDialogs у каждой сессии (loadUnreadDialogs).
 * Без дедупликации один dialog.id даёт по строке превью на каждую сессию — на мобильном список и счётчик врут.
 */
function collectDedupedUnreadDialogsForPreview(
  sessions: Array<{
    id: string;
    unreadDialogs?: UnreadDialog[];
    selectedDialog?: { id?: unknown };
    assignedDialogId?: unknown;
  }>,
  hasSessionWithUser: (userId: number) => boolean,
): { dialog: UnreadDialog; sessionId: string }[] {
  const seenDialogIds = new Set<number>();
  const rows: { dialog: UnreadDialog; sessionId: string }[] = [];

  for (const session of sessions) {
    const unreadList =
      session.unreadDialogs?.filter((dialog) => {
        const dialogUserId = dialog.owner?.id;
        if (dialogUserId && hasSessionWithUser(dialogUserId)) return false;
        if (sessionListAlreadyCoversDialog(sessions, dialog.id)) return false;
        return true;
      }) ?? [];

    for (const dialog of unreadList) {
      if (seenDialogIds.has(dialog.id)) continue;
      seenDialogIds.add(dialog.id);
      rows.push({ dialog, sessionId: session.id });
    }
  }

  return rows;
}

function previewLineFromMessagePayload(msg: unknown, attachmentLabel: string): string {
  if (!msg || typeof msg !== 'object') return '';
  const m = msg as { text?: string; attachments?: unknown[] };
  const text = (m.text || '').trim();
  if (text.length > 0) return text;
  if (Array.isArray(m.attachments) && m.attachments.length > 0) return attachmentLabel;
  return '';
}

function truncatePreviewLine(text: string, maxLen: number): string {
  const s = text.trim();
  if (!s) return '';
  return s.length <= maxLen ? s : `${s.slice(0, maxLen)}…`;
}

function unreadCountForPreviewEntry(
  dialog: UnreadDialog,
  dialogsUnreadCounts: Map<number, number> | undefined,
  /** Только если для dialogId ещё нет ключа в карте: прежний обходной путь, когда карта отстаёт. */
  solePreviewSocketTotalHint: number = 0,
): number {
  const map = dialogsUnreadCounts || new Map();
  const fromApi = Number(dialog.countUnMessages ?? dialog.countUnreadMess ?? 0);
  const apiSafe = Number.isFinite(fromApi) ? fromApi : 0;
  const isClosed = String((dialog as any)?.status ?? '').toUpperCase() === 'CLOSED';
  // Есть явная запись по этому диалогу — только она (иначе при ровно одной строке превью
  // solePreviewSocketTotalHint = общий агрегат и «чужой» +1 заливает бейдж другого dialogId).
  if (map.has(dialog.id)) {
    const fromMap = map.get(dialog.id)!;
    // Для CLOSED backend snapshot по непрочитанным может быть свежее детальной карты WS.
    // Не даём занижать бейдж превью (кейс: map=1, фактически/API=7).
    return isClosed ? Math.max(fromMap, apiSafe) : fromMap;
  }
  const base = apiSafe;
  if (solePreviewSocketTotalHint <= 0) return base;
  return Math.max(base, solePreviewSocketTotalHint);
}

/**
 * Счётчик на превью свёрнутой сессии: dialogId из ленты (если однозначен), иначе метаданные;
 * если в WS-карте есть запись для этого id — она приоритетнее session.unreadCount.
 */
function effectiveMinimizedSessionUnread(
  session: {
    selectedDialog?: { id?: unknown };
    assignedDialogId?: unknown;
    unreadCount?: number;
    messages?: any[];
    unreadDialogs?: UnreadDialog[];
  },
  dialogsUnreadCounts: Map<number, number> | undefined,
): number {
  const dialogId = resolveSessionDialogIdForUnread(session);
  const local = session.unreadCount ?? 0;
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
  const fromUnreadDialogsApi =
    dialogId != null
      ? Number(
          session.unreadDialogs?.find((d) => Number(d.id) === Number(dialogId))?.countUnMessages ??
            session.unreadDialogs?.find((d) => Number(d.id) === Number(dialogId))
              ?.countUnreadMess ??
            0,
        )
      : 0;
  const apiSafe = Number.isFinite(fromUnreadDialogsApi) ? fromUnreadDialogsApi : 0;
  const map = dialogsUnreadCounts;
  if (dialogId != null && map != null && map.has(dialogId)) {
    return Math.max(map.get(dialogId)!, local, apiSafe, fromMessages);
  }
  return Math.max(local, apiSafe, fromMessages);
}

function unreadInSessionMessagesByDialog(
  session: { messages?: any[] } | undefined,
  dialogId: number,
): number {
  if (!session?.messages?.length) return 0;
  return session.messages.reduce((acc: number, msg: any) => {
    const mid = Number(msg.dialogId ?? msg.dialog?.id ?? NaN);
    if (mid !== Number(dialogId)) return acc;
    if (msg.messageStatus !== 'TO_OPERATOR') return acc;
    if (msg.is_read) return acc;
    if (String(msg.confirmStatus ?? '').toUpperCase() === 'READ') return acc;
    return acc + 1;
  }, 0);
}

function minimizedSessionPreviewRaw(
  session: {
    messages?: any[];
    selectedDialog?: { id?: unknown };
    assignedDialogId?: unknown;
  },
  fetchedByDialogId: Record<number, string>,
  attachmentLabel: string,
): string {
  if (session.messages?.length) {
    const last = session.messages[session.messages.length - 1];
    const local = previewLineFromMessagePayload(last, attachmentLabel);
    if (local) return local;
  }
  const did = normalizeSessionDialogId(session.selectedDialog?.id ?? session.assignedDialogId);
  if (did !== null) {
    const fetched = (fetchedByDialogId[did] || '').trim();
    if (fetched) return fetched;
  }
  return '';
}

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
  const { calculateTotalUnread, dialogsUnreadCounts, unreadCount: socketUnreadTotal } = useSocket();
  const iconUnreadTotalBase = calculateTotalUnread();
  // Редкий кейс сразу после жёсткой перезагрузки: общий бейдж может кратковременно быть 0,
  // пока WS-карта/агрегат не синхронизировались, но в сессии уже есть непрочитанные по ленте.
  // Не даём показывать 0, если хоть где-то в сессиях вычисляется unread>0.
  const maxSessionUnreadFallback = sessions.reduce((acc: number, s: any) => {
    return Math.max(acc, effectiveMinimizedSessionUnread(s, dialogsUnreadCounts));
  }, 0);
  // Если и карта/агрегат через calculateTotalUnread, и сессии дают 0, не поднимаем бейдж
  // устаревшим socketUnreadTotal (/user/queue/unread): он нередко отстаёт после READ/STATUS_UPDATE
  // при уже нулевой per-dialog карте (см. calculateTotalUnread в SocketContext).
  const iconUnreadTotal =
    iconUnreadTotalBase > 0
      ? iconUnreadTotalBase
      : maxSessionUnreadFallback > 0
        ? Math.max(socketUnreadTotal ?? 0, maxSessionUnreadFallback)
        : 0;

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

  const tooltipTitle = t('chat.toggleTooltip', { count: iconUnreadTotal });

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
        <UnreadMessagesBadge count={iconUnreadTotal} />
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
  const location = useLocation();
  const isOperatorChatPopupWindow = location.pathname === RoutePaths.operatorChatPopup;
  const {
    isChatOpen,
    sessions,
    setActiveSessionId,
    closeSession,
    expandSession,
    forceRefreshSessionMessages,
    toggleSessionMinimize,
    setIsChatOpen,
    openUnreadDialog,
    hasSessionWithUser,
  } = useChat();
  const {
    lastMessage,
    dialogsUnreadCounts,
    unreadCount: socketUnreadTotal,
    calculateTotalUnread,
  } = useSocket();
  const [isVisible, setIsVisible] = useState(true);
  const [justExpandedSessionId, setJustExpandedSessionId] = useState<string | null>(null);
  const hasChatPermissions = useOperatorPermissions();

  // Агрегат и карта по диалогам ведёт только SocketContext (кадры WS). Ранее здесь
  // вызывался setUnreadCount по любому lastMessage с countUnMessages — в том числе
  // DIALOGS_UPDATE с 0 — это обнуляло бейдж и ломало mergeDialogUnreadFromApi.

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
      const snap = sessions.map((s) => ({
        id: s.id,
        min: s.isMinimized,
        user: s.selectedUsers?.[0],
        dialog:
          s.selectedDialog?.id != null
            ? String(s.selectedDialog.id)
            : s.assignedDialogId != null
              ? String(s.assignedDialogId)
              : null,
        unread: s.unreadCount,
      }));
      operatorUnreadDebug(
        'Раскрытие сессии из превью (включится скролл к первому непрочитанному при необходимости)',
        {
          целеваяСессия: sessionId,
          сессии: snap,
          развёрнуты: sessions.filter((s) => !s.isMinimized).map((s) => s.id),
          свёрнуты: sessions.filter((s) => s.isMinimized).map((s) => s.id),
        },
      );
      setJustExpandedSessionId(sessionId);
      expandSession(sessionId);
      // После раскрытия из превью синхронизируем сессию с актуальными данными диалога
      // (в т.ч. status/lastOperator), чтобы избежать отображения устаревшего блокирующего оператора.
      setTimeout(() => {
        void forceRefreshSessionMessages(sessionId);
      }, 0);
    },
    [expandSession, forceRefreshSessionMessages, sessions],
  );

  const handleScrollToBottomDone = useCallback(() => {
    setJustExpandedSessionId(null);
  }, []);

  const handleOperatorChatWindowButtonClick = useCallback(() => {
    if (isOperatorChatPopupWindow) {
      closeOperatorChatPopupAndRestoreMain();
    } else {
      openOperatorChatPopup();
    }
  }, [isOperatorChatPopupWindow]);

  const operatorChatWindowButtonLabel = t(
    isOperatorChatPopupWindow ? 'chat.returnToSingleWindow' : 'chat.openInSeparateWindow',
  );

  const isCompactMinimizedUi = useMediaQuery(CHAT_COMPACT_MINIMIZED_QUERY);
  const [minimizedListOpen, setMinimizedListOpen] = useState(false);

  const expandedSessionCount = useMemo(
    () => sessions.filter((s) => !s.isMinimized).length,
    [sessions],
  );
  // В попапе после shrink-to-fit окно часто <1024px — без исключения dock пропадал бы из‑за compact.
  // Пустой dock при 0 развёрнутых сессиях нельзя: useOperatorChatPopupWindowFrame схлопывает окно под колонку FAB.
  const allowDesktopPanelResize =
    expandedSessionCount > 0 && (!isCompactMinimizedUi || isOperatorChatPopupWindow);

  const [panelSize, setPanelSize] = useState<ChatFooterPanelSize>(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_CHAT_PANEL };
    }
    const saved = readSavedPanelSize(isOperatorChatPopupWindow);
    if (saved) {
      return clampPanelSize(saved);
    }
    return { ...DEFAULT_CHAT_PANEL };
  });

  const chatUiScale = useMemo(() => {
    if (!allowDesktopPanelResize) return 1;
    const sw = panelSize.w / DEFAULT_CHAT_PANEL.w;
    const sh = panelSize.h / DEFAULT_CHAT_PANEL.h;
    const raw = Math.min(sw, sh);
    return Math.min(Math.max(raw, 0.78), 1.38);
  }, [allowDesktopPanelResize, panelSize.h, panelSize.w]);

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
        subtitle?: string;
        unread: number;
      };

  const dedupedUnreadPreviewRows = useMemo(
    () => collectDedupedUnreadDialogsForPreview(sessions, hasSessionWithUser),
    [sessions, hasSessionWithUser],
  );

  const solePreviewSocketUnreadHint = useMemo(() => {
    if (dedupedUnreadPreviewRows.length !== 1) return 0;
    return calculateTotalUnread();
  }, [dedupedUnreadPreviewRows, calculateTotalUnread]);

  const expandedSessions = useMemo(() => sessions.filter((s) => !s.isMinimized), [sessions]);

  const minimizedSessions = useMemo(
    () =>
      sessions.filter(
        (session) => session.isMinimized && hasRenderableMinimizedContent(session),
      ),
    [sessions],
  );

  const [dockRightPx, setDockRightPx] = useState(
    () => readSavedDockMargins(isOperatorChatPopupWindow)?.r ?? CHAT_FOOTER_RIGHT,
  );
  const [dockBottomPx, setDockBottomPx] = useState(
    () => readSavedDockMargins(isOperatorChatPopupWindow)?.b ?? CHAT_FOOTER_BOTTOM,
  );
  const [isDockDragging, setIsDockDragging] = useState(false);

  const dockPosRef = useRef({ r: CHAT_FOOTER_RIGHT, b: CHAT_FOOTER_BOTTOM });
  /** Чтобы при первом mount с 0 сессий не сбрасывать dock; сброс только при переходе N>0 → 0 (закрыли весь чат). */
  const prevSessionsLenForDockRef = useRef<number | null>(null);
  /** Только основная вкладка: свернули последнюю панель — сброс размеров/позиции dock в LS. В попапе не трогаем. */
  const prevAllowDesktopPanelResizeRef = useRef<boolean | null>(null);
  const dockDimensionsRef = useRef({ dockW: DEFAULT_CHAT_PANEL.w, dockH: DEFAULT_CHAT_PANEL.h });

  /** Сброс геометрии чата только в основном окне (не в operator-chat-popup). */
  const resetMainWindowChatLayoutToDefaults = useCallback(() => {
    setPanelSize({ ...DEFAULT_CHAT_PANEL });
    setDockRightPx(CHAT_FOOTER_RIGHT);
    setDockBottomPx(CHAT_FOOTER_BOTTOM);
    dockPosRef.current = { r: CHAT_FOOTER_RIGHT, b: CHAT_FOOTER_BOTTOM };
    try {
      const k = chatPanelDockStorageKeys(false);
      localStorage.removeItem(k.panelW);
      localStorage.removeItem(k.panelH);
      localStorage.removeItem(k.dockR);
      localStorage.removeItem(k.dockB);
    } catch {
      /* ignore */
    }
  }, []);

  const dockDimensions = useMemo(() => {
    if (!allowDesktopPanelResize) {
      return { dockW: DEFAULT_CHAT_PANEL.w, dockH: DEFAULT_CHAT_PANEL.h };
    }
    const previewCount = minimizedSessions.length + dedupedUnreadPreviewRows.length;
    const pw = panelSize.w;
    const ph = panelSize.h;
    const nExp = expandedSessions.length;
    const previewColW = previewCount > 0 ? 260 : 0;
    const previewStackH =
      previewCount > 0
        ? previewCount * DOCK_PREVIEW_ROW_APPROX_PX + (previewCount - 1) * 8
        : 0;
    const panelsStackH = nExp * ph + Math.max(0, nExp - 1) * 8;
    const dockH = Math.max(previewStackH, panelsStackH, DOCK_FAB_STACK_H_PX);
    const dockW =
      DOCK_FAB_COLUMN_W_PX + 2 * MINIMIZED_PREVIEW_GAP_PX + pw + (previewCount > 0 ? previewColW : 0);
    return { dockW, dockH };
  }, [
    allowDesktopPanelResize,
    dedupedUnreadPreviewRows.length,
    expandedSessions.length,
    minimizedSessions.length,
    panelSize.h,
    panelSize.w,
  ]);

  dockDimensionsRef.current = dockDimensions;

  dockPosRef.current = { r: dockRightPx, b: dockBottomPx };

  useEffect(() => {
    const prev = prevSessionsLenForDockRef.current;
    prevSessionsLenForDockRef.current = sessions.length;
    if (prev === null) {
      return;
    }
    if (prev > 0 && sessions.length === 0) {
      if (isOperatorChatPopupWindow) {
        setDockRightPx(CHAT_FOOTER_RIGHT);
        setDockBottomPx(CHAT_FOOTER_BOTTOM);
        dockPosRef.current = { r: CHAT_FOOTER_RIGHT, b: CHAT_FOOTER_BOTTOM };
        try {
          const k = chatPanelDockStorageKeys(true);
          localStorage.removeItem(k.dockR);
          localStorage.removeItem(k.dockB);
        } catch {
          /* ignore */
        }
      } else {
        resetMainWindowChatLayoutToDefaults();
      }
    }
  }, [sessions.length, isOperatorChatPopupWindow, resetMainWindowChatLayoutToDefaults]);

  useEffect(() => {
    const prev = prevAllowDesktopPanelResizeRef.current;
    const cur = allowDesktopPanelResize;
    prevAllowDesktopPanelResizeRef.current = cur;
    if (prev !== true || cur !== false) return;
    if (isOperatorChatPopupWindow) return;
    resetMainWindowChatLayoutToDefaults();
  }, [allowDesktopPanelResize, isOperatorChatPopupWindow, resetMainWindowChatLayoutToDefaults]);

  const handleDockDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!allowDesktopPanelResize) return;
      if (e.button !== 0) return;
      e.preventDefault();
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      const startR = dockPosRef.current.r;
      const startB = dockPosRef.current.b;
      setIsDockDragging(true);

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        ev.preventDefault();
        const { dockW, dockH } = dockDimensionsRef.current;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const { r, b } = clampDockMargins(startR - dx, startB - dy, dockW, dockH);
        dockPosRef.current = { r, b };
        setDockRightPx(r);
        setDockBottomPx(b);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        ev.preventDefault();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        setIsDockDragging(false);
        try {
          const { r, b } = dockPosRef.current;
          const k = chatPanelDockStorageKeys(isOperatorChatPopupWindow);
          localStorage.setItem(k.dockR, String(r));
          localStorage.setItem(k.dockB, String(b));
        } catch {
          /* ignore */
        }
      };

      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp, { passive: false });
      window.addEventListener('pointercancel', onUp, { passive: false });
    },
    [allowDesktopPanelResize, isOperatorChatPopupWindow],
  );

  useEffect(() => {
    if (!allowDesktopPanelResize) return;
    const onWin = () => {
      const { dockW, dockH } = dockDimensionsRef.current;
      const c = clampDockMargins(dockPosRef.current.r, dockPosRef.current.b, dockW, dockH);
      setDockRightPx(c.r);
      setDockBottomPx(c.b);
    };
    window.addEventListener('resize', onWin);
    return () => window.removeEventListener('resize', onWin);
  }, [allowDesktopPanelResize]);

  useEffect(() => {
    if (!allowDesktopPanelResize) return;
    const { dockW, dockH } = dockDimensions;
    const curR = dockPosRef.current.r;
    const curB = dockPosRef.current.b;
    const c = clampDockMargins(curR, curB, dockW, dockH);
    if (c.r !== curR || c.b !== curB) {
      setDockRightPx(c.r);
      setDockBottomPx(c.b);
    }
  }, [allowDesktopPanelResize, dockDimensions.dockH, dockDimensions.dockW]);

  const dockPreviewCount = minimizedSessions.length + dedupedUnreadPreviewRows.length;

  const resolvePanelSize = useCallback(
    (s: ChatFooterPanelSize) => {
      if (!allowDesktopPanelResize) return clampPanelSize(s);
      return clampPanelSizeForFloatingDock(s, {
        previewCount: dockPreviewCount,
        expandedCount: expandedSessions.length,
        dockRightPx,
        dockBottomPx,
      });
    },
    [
      allowDesktopPanelResize,
      dockPreviewCount,
      expandedSessions.length,
      dockRightPx,
      dockBottomPx,
    ],
  );

  const getMaxPanelSize = useCallback(
    () =>
      getMaxPanelSizeForFloatingDock({
        previewCount: dockPreviewCount,
        expandedCount: expandedSessions.length,
        dockRightPx,
        dockBottomPx,
      }),
    [dockPreviewCount, expandedSessions.length, dockRightPx, dockBottomPx],
  );

  const handlePanelSizeCommit = useCallback(
    (next: ChatFooterPanelSize) => {
      const clamped = resolvePanelSize(next);
      setPanelSize(clamped);
      try {
        const k = chatPanelDockStorageKeys(isOperatorChatPopupWindow);
        localStorage.setItem(k.panelW, String(clamped.w));
        localStorage.setItem(k.panelH, String(clamped.h));
      } catch {
        /* ignore */
      }
    },
    [resolvePanelSize, isOperatorChatPopupWindow],
  );

  useLayoutEffect(() => {
    if (!allowDesktopPanelResize) return;
    setPanelSize((prev) => resolvePanelSize(prev));
  }, [allowDesktopPanelResize, resolvePanelSize]);

  useEffect(() => {
    if (!allowDesktopPanelResize) return;
    const onWinResize = () => {
      setPanelSize((prev) => resolvePanelSize(prev));
    };
    window.addEventListener('resize', onWinResize);
    return () => window.removeEventListener('resize', onWinResize);
  }, [allowDesktopPanelResize, resolvePanelSize]);

  const dialogIdsToFetch = useMemo(() => {
    const ids = new Set<number>();
    dedupedUnreadPreviewRows.forEach(({ dialog }) => ids.add(dialog.id));
    for (const s of sessions) {
      if (!s.isMinimized) continue;
      if (s.messages?.length) continue;
      const d = normalizeSessionDialogId(s.selectedDialog?.id ?? s.assignedDialogId);
      if (d !== null) ids.add(d);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [dedupedUnreadPreviewRows, sessions]);

  const [dialogPreviewLines, setDialogPreviewLines] = useState<Record<number, string>>({});
  const dialogFetchKey = dialogIdsToFetch.join(',');

  useEffect(() => {
    if (dialogIdsToFetch.length === 0) {
      setDialogPreviewLines({});
      return;
    }

    let cancelled = false;
    const attachmentLabel = t('chat.previewAttachment');

    void (async () => {
      const results = await Promise.all(
        dialogIdsToFetch.map(async (dialogId) => {
          try {
            const res = await DialogsApi.getMessages({
              dialogId: String(dialogId),
              page: 0,
              size: 1,
              sort: 'createdAt,desc',
            });
            const msg = res?.data?.content?.[0];
            return [dialogId, previewLineFromMessagePayload(msg, attachmentLabel)] as const;
          } catch {
            return [dialogId, ''] as const;
          }
        }),
      );

      if (cancelled) return;
      setDialogPreviewLines(Object.fromEntries(results) as Record<number, string>);
    })();

    return () => {
      cancelled = true;
    };
  }, [dialogFetchKey, t]);

  const attachmentLabel = t('chat.previewAttachment');

  const compactMinimizedEntries = useMemo((): CompactMinimizedEntry[] => {
    const minimized = sessions.filter((s) => s.isMinimized && hasRenderableMinimizedContent(s));
    const items: CompactMinimizedEntry[] = [];

    minimized.forEach((session) => {
      const raw = minimizedSessionPreviewRaw(session, dialogPreviewLines, attachmentLabel);
      const subtitle = truncatePreviewLine(raw, 60);
      items.push({
        kind: 'session',
        key: `minimized-${session.id}`,
        sessionId: session.id,
        title:
          session.selectedUserName ||
          session.selectedDialog?.client_name ||
          t('chat.newChatFallback'),
        subtitle: subtitle || undefined,
        unread: effectiveMinimizedSessionUnread(session, dialogsUnreadCounts),
      });
    });

    dedupedUnreadPreviewRows.forEach(({ dialog, sessionId }) => {
      const sessionForDialog = sessions.find((s) => s.id === sessionId);
      const unreadFromSessionMessages = unreadInSessionMessagesByDialog(
        sessionForDialog,
        dialog.id,
      );
      const unreadCountBase = unreadCountForPreviewEntry(
        dialog,
        dialogsUnreadCounts,
        solePreviewSocketUnreadHint,
      );
      const unreadCount = Math.max(unreadCountBase, unreadFromSessionMessages);
      const raw = (dialogPreviewLines[dialog.id] || '').trim();
      const subtitle = truncatePreviewLine(raw, 60);
      items.push({
        kind: 'unread',
        key: `unread-${dialog.id}`,
        sessionId,
        dialog,
        title: dialog.owner.fullName,
        subtitle: subtitle || undefined,
        unread: unreadCount,
      });
    });

    return items;
  }, [
    sessions,
    dedupedUnreadPreviewRows,
    dialogsUnreadCounts,
    dialogPreviewLines,
    attachmentLabel,
    t,
    solePreviewSocketUnreadHint,
  ]);

  useEffect(() => {
    const previewUnreadBadges = compactMinimizedEntries
      .filter((e): e is Extract<typeof e, { kind: 'unread' }> => e.kind === 'unread')
      .map((e) => ({
        dialogId: e.dialog.id,
        badge: e.unread,
        title: e.title,
      }));
    const listUnreadSum = compactMinimizedEntries.reduce((s, e) => s + e.unread, 0);
    const minimizedListToggleBadge =
      listUnreadSum > 0 ? listUnreadSum : compactMinimizedEntries.length;
    operatorUnreadDebug('Бейджи превью и карта WS по диалогам', {
      всегоПоИконкеЧата: calculateTotalUnread(),
      агрегатUserQueueНеТолькоДиалоги: socketUnreadTotal,
      суммаВКомпактномСписке: minimizedListToggleBadge,
      картаДиалоговWs: unreadMapSnapshot(dialogsUnreadCounts),
      строкиПревьюНеизСписка: previewUnreadBadges,
      свёрнутыеСессии: sessions
        .filter((s) => s.isMinimized)
        .map((s) => ({
          sessionId: s.id,
          бейдж: effectiveMinimizedSessionUnread(s, dialogsUnreadCounts),
          sessionUnreadCount: s.unreadCount ?? 0,
        })),
      последнийWsТип: lastMessage?.type,
    });
  }, [
    compactMinimizedEntries,
    dialogsUnreadCounts,
    socketUnreadTotal,
    sessions,
    lastMessage?.type,
    lastMessage?.destination,
    calculateTotalUnread,
  ]);

  if (!hasChatPermissions) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  const minimizedPreviewRightPx =
    expandedSessions.length > 0
      ? CHAT_FOOTER_RIGHT +
        (allowDesktopPanelResize ? panelSize.w : DEFAULT_CHAT_PANEL.w) +
        MINIMIZED_PREVIEW_GAP_PX
      : CHAT_FOOTER_RIGHT;

  const hasUnreadInCompactList = compactMinimizedEntries.some((e) => e.unread > 0);
  const compactListUnreadSum = compactMinimizedEntries.reduce((s, e) => s + e.unread, 0);
  const minimizedListToggleBadge =
    compactListUnreadSum > 0 ? compactListUnreadSum : compactMinimizedEntries.length;

  return (
    <div className={styles.chatContainer}>
      {!allowDesktopPanelResize && <NewChatButton />}
      {isOperatorChatPopupWindow && !allowDesktopPanelResize && (
        <Tooltip title={operatorChatWindowButtonLabel} placement="left">
          <div className={styles.operatorPopupReturnFab}>
            <IconButton
              className={styles.dockOpenWindowButton}
              size="large"
              color="primary"
              onClick={handleOperatorChatWindowButtonClick}
              aria-label={operatorChatWindowButtonLabel}>
              <OpenInBrowserIcon />
            </IconButton>
          </div>
        </Tooltip>
      )}
      {isCompactMinimizedUi && !isOperatorChatPopupWindow && compactMinimizedEntries.length > 0 && (
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
                {minimizedListToggleBadge > 99 ? '99+' : minimizedListToggleBadge}
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
                      setJustExpandedSessionId(entry.sessionId);
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
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{
                      flexShrink: 0,
                      bgcolor: entry.unread > 0 ? 'error.main' : 'action.selected',
                      color: entry.unread > 0 ? 'error.contrastText' : 'text.secondary',
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
                </ListItemButton>
              ))}
            </List>
          </Drawer>
        </>
      )}
      {!allowDesktopPanelResize && <ChatToggleButton />}

      {allowDesktopPanelResize ? (
        <div
          className={`${styles.chatFloatingDock} ${isDockDragging ? styles.chatFloatingDockDragging : ''}`}
          style={{ right: dockRightPx, bottom: dockBottomPx }}
          {...(isOperatorChatPopupWindow ? { 'data-operator-chat-dock': '1' } : {})}>
          <div className={styles.dockFabColumn}>
            <Tooltip title={operatorChatWindowButtonLabel} placement="left">
              <IconButton
                className={styles.dockOpenWindowButton}
                size="large"
                color="primary"
                onClick={handleOperatorChatWindowButtonClick}
                aria-label={operatorChatWindowButtonLabel}>
                {isOperatorChatPopupWindow ? <OpenInBrowserIcon /> : <OpenInNewIcon />}
              </IconButton>
            </Tooltip>
            <NewChatButton />
            <ChatToggleButton />
          </div>
          <div className={styles.dockPanelsColumn}>
            {expandedSessions.map((session) => (
              <ChatFooterResizableFrame
                key={`expanded-${session.id}`}
                docked
                size={panelSize}
                onSizeLiveChange={(s) => setPanelSize(resolvePanelSize(s))}
                onSizeCommit={handlePanelSizeCommit}
                minSize={MIN_CHAT_PANEL}
                getMaxSize={getMaxPanelSize}>
                <Card
                  className={`${styles.chatFooter} ${styles.expanded} ${styles.chatFooterFluid}`}
                  sx={{
                    '--chat-ui-scale': chatUiScale,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                  }}>
                  <ChatPanel
                    sessionId={session.id}
                    onMinimize={() => handleToggleSessionMinimize(session.id)}
                    scrollToBottomOnExpand={justExpandedSessionId === session.id}
                    onScrollToBottomDone={handleScrollToBottomDone}
                    dockDragEnabled
                    onDockDragPointerDown={handleDockDragPointerDown}
                  />
                </Card>
              </ChatFooterResizableFrame>
            ))}
          </div>
          <div className={`${styles.minimizedChats} ${styles.minimizedChatsDocked}`}>
            {minimizedSessions.map((session, index) => {
              const previewLine = truncatePreviewLine(
                minimizedSessionPreviewRaw(session, dialogPreviewLines, attachmentLabel),
                30,
              );
              const minimizedUnread = effectiveMinimizedSessionUnread(session, dialogsUnreadCounts);
              return (
                <div
                  key={`minimized-${session.id}`}
                  className={`${styles.minimizedChat} ${minimizedUnread > 0 ? styles.hasUnread : ''}`}
                  style={{ zIndex: 1000 - index }}
                  onClick={() => handleExpandSession(session.id)}>
                  <div className={styles.minimizedHeader}>
                    <span>
                      {session.selectedUserName ||
                        session.selectedDialog?.client_name ||
                        t('chat.newChatFallback')}
                    </span>
                    <span className={styles.unreadBadge}>
                      {minimizedUnread > 99 ? '99+' : minimizedUnread}
                    </span>
                  </div>
                  {previewLine ? <div className={styles.lastMessage}>{previewLine}</div> : null}
                </div>
              );
            })}

            {dedupedUnreadPreviewRows.map(({ dialog, sessionId }, index) => {
              const sessionForDialog = sessions.find((s) => s.id === sessionId);
              const unreadFromSessionMessages = unreadInSessionMessagesByDialog(
                sessionForDialog,
                dialog.id,
              );
              const unreadCountBase = unreadCountForPreviewEntry(
                dialog,
                dialogsUnreadCounts,
                solePreviewSocketUnreadHint,
              );
              const unreadCount = Math.max(unreadCountBase, unreadFromSessionMessages);
              const raw = (dialogPreviewLines[dialog.id] || '').trim();
              const line = truncatePreviewLine(raw, 30);

              return (
                <div
                  key={`unread-${dialog.id}`}
                  className={`${styles.minimizedChat} ${styles.unreadDialog} ${
                    unreadCount > 0 ? styles.hasUnread : ''
                  }`}
                  style={{ zIndex: 1000 - (minimizedSessions.length + index) }}
                  onClick={async () => {
                    setJustExpandedSessionId(sessionId);
                    await openUnreadDialog(sessionId, dialog);
                  }}>
                  <div className={styles.minimizedHeader}>
                    <span>{dialog.owner.fullName}</span>
                    <span className={styles.unreadBadge}>{unreadCount}</span>
                  </div>
                  {line ? <div className={styles.lastMessage}>{line}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.minimizedChats}>
            {minimizedSessions.map((session, index) => {
              const previewLine = truncatePreviewLine(
                minimizedSessionPreviewRaw(session, dialogPreviewLines, attachmentLabel),
                30,
              );
              const minimizedUnread = effectiveMinimizedSessionUnread(session, dialogsUnreadCounts);
              return (
                <div
                  key={`minimized-${session.id}`}
                  className={`${styles.minimizedChat} ${minimizedUnread > 0 ? styles.hasUnread : ''}`}
                  style={{
                    bottom: `${120 + index * 60}px`,
                    right: `${minimizedPreviewRightPx}px`,
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
                      {minimizedUnread > 99 ? '99+' : minimizedUnread}
                    </span>
                  </div>
                  {previewLine ? <div className={styles.lastMessage}>{previewLine}</div> : null}
                </div>
              );
            })}

            {dedupedUnreadPreviewRows.map(({ dialog, sessionId }, index) => {
              const sessionForDialog = sessions.find((s) => s.id === sessionId);
              const unreadFromSessionMessages = unreadInSessionMessagesByDialog(
                sessionForDialog,
                dialog.id,
              );
              const unreadCountBase = unreadCountForPreviewEntry(
                dialog,
                dialogsUnreadCounts,
                solePreviewSocketUnreadHint,
              );
              const unreadCount = Math.max(unreadCountBase, unreadFromSessionMessages);
              const raw = (dialogPreviewLines[dialog.id] || '').trim();
              const line = truncatePreviewLine(raw, 30);

              return (
                <div
                  key={`unread-${dialog.id}`}
                  className={`${styles.minimizedChat} ${styles.unreadDialog} ${
                    unreadCount > 0 ? styles.hasUnread : ''
                  }`}
                  style={{
                    bottom: `${120 + (minimizedSessions.length + index) * 60}px`,
                    right: `${minimizedPreviewRightPx}px`,
                    zIndex: 1000 - (minimizedSessions.length + index),
                  }}
                  onClick={async () => {
                    setJustExpandedSessionId(sessionId);
                    await openUnreadDialog(sessionId, dialog);
                  }}>
                  <div className={styles.minimizedHeader}>
                    <span>{dialog.owner.fullName}</span>
                    <span className={styles.unreadBadge}>{unreadCount}</span>
                  </div>
                  {line ? <div className={styles.lastMessage}>{line}</div> : null}
                </div>
              );
            })}
          </div>

          {expandedSessions.map((session) => (
            <Card
              key={`expanded-${session.id}`}
              className={`${styles.chatFooter} ${styles.expanded}`}>
              <ChatPanel
                sessionId={session.id}
                onMinimize={() => handleToggleSessionMinimize(session.id)}
                scrollToBottomOnExpand={justExpandedSessionId === session.id}
                onScrollToBottomDone={handleScrollToBottomDone}
              />
            </Card>
          ))}
        </>
      )}
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
