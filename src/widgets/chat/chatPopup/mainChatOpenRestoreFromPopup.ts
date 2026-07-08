import type { ChatSession } from '../contexts/types/ChatTypes';
import {
  CHAT_DESKTOP_SOCKET_UNREAD_HANDOFF_KEY,
  CHAT_MAIN_POPUP_RETURN_HANDOFF_SESSION_KEY,
  CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY,
  CHAT_MAIN_RESTORE_IS_CHAT_OPEN_FROM_POPUP_KEY,
  CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_LOCAL_KEY,
  CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_SESSION_KEY,
  CHAT_MAIN_TO_OPERATOR_POPUP_HANDOFF_LOCAL_KEY,
  CHAT_OPERATOR_POPUP_PREVIEW_SNAPSHOT_KEY,
} from './constants';

/** Снимок сессии для передачи из popup в основную вкладку (только JSON-поля). */
export type PopupReturnSerializedSession = {
  id: string;
  isMinimized: boolean;
  selectedUsers: number[];
  selectedUserName: string;
  selectedDialogId: string | number | null;
  assignedDialogId: string | null;
  unreadDialogs?: ChatSession['unreadDialogs'];
  unreadCount?: number;
  totalUnreadCount?: number;
  /** Electron main→popup: лента для бейджа превью (в popup иначе messages: []). */
  minimizedMessages?: ChatSession['messages'];
};

export type PopupReturnHandoffPayload =
  | { v: 1; isChatOpen: boolean }
  | {
      v: 2;
      isChatOpen: boolean;
      activeSessionId: string | null;
      sessions: PopupReturnSerializedSession[];
    };

export type OperatorPopupPreviewSnapshotEntry =
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
      dialog: NonNullable<ChatSession['unreadDialogs']>[number];
      title: string;
      subtitle?: string;
      unread: number;
    };

function previewLineFromSession(s: ChatSession): string {
  const last = Array.isArray(s.messages) ? s.messages[s.messages.length - 1] : null;
  const text = typeof last?.text === 'string' ? last.text.trim() : '';
  if (text) return text.length <= 60 ? text : `${text.slice(0, 60)}…`;
  return '';
}

function buildOperatorPopupPreviewSnapshot(
  sessions: ChatSession[],
): OperatorPopupPreviewSnapshotEntry[] {
  const entries: OperatorPopupPreviewSnapshotEntry[] = [];
  const coveredDialogIds = new Set<string>();

  sessions.forEach((session) => {
    const selectedDialogId =
      session.selectedDialog?.id != null ? String(session.selectedDialog.id) : session.assignedDialogId;
    if (selectedDialogId) coveredDialogIds.add(String(selectedDialogId));

    if (!session.isMinimized) return;
    const title =
      session.selectedUserName ||
      session.selectedDialog?.client_name ||
      session.selectedDialog?.clientName ||
      '';
    if (!title.trim()) return;
    entries.push({
      kind: 'session',
      key: `snapshot-minimized-${session.id}`,
      sessionId: session.id,
      title,
      subtitle: previewLineFromSession(session) || undefined,
      unread: Math.max(session.unreadCount ?? 0, session.totalUnreadCount ?? 0),
    });
  });

  const seenUnreadIds = new Set<number>();
  sessions.forEach((session) => {
    (session.unreadDialogs ?? []).forEach((dialog) => {
      if (!dialog?.id || seenUnreadIds.has(dialog.id)) return;
      if (coveredDialogIds.has(String(dialog.id))) return;
      seenUnreadIds.add(dialog.id);
      entries.push({
        kind: 'unread',
        key: `snapshot-unread-${dialog.id}`,
        sessionId: session.id,
        dialog,
        title: dialog.owner?.fullName || 'Непрочитанный диалог',
        unread: Math.max(
          Number(dialog.countUnMessages ?? 0),
          Number(dialog.countUnreadMess ?? 0),
          0,
        ),
      });
    });
  });

  return entries;
}

export function serializeSessionsForPopupHandoff(
  sessions: ChatSession[],
): PopupReturnSerializedSession[] {
  const includeMinimizedMessages = isElectronMainWindowForHandoff();
  return sessions.map((s) => ({
    id: s.id,
    isMinimized: Boolean(s.isMinimized),
    selectedUsers: Array.isArray(s.selectedUsers) ? [...s.selectedUsers] : [],
    selectedUserName: s.selectedUserName ?? '',
    selectedDialogId:
      s.selectedDialog?.id != null &&
      String(s.selectedDialog.id) !== '' &&
      String(s.selectedDialog.id) !== '0' &&
      String(s.selectedDialog.id) !== 'assigned'
        ? s.selectedDialog.id
        : null,
    assignedDialogId:
      s.assignedDialogId != null &&
      String(s.assignedDialogId) !== '' &&
      String(s.assignedDialogId) !== '0' &&
      String(s.assignedDialogId) !== 'assigned'
        ? String(s.assignedDialogId)
        : null,
    unreadDialogs: Array.isArray(s.unreadDialogs) ? s.unreadDialogs : [],
    unreadCount: s.unreadCount,
    totalUnreadCount: s.totalUnreadCount,
    ...(includeMinimizedMessages && s.isMinimized && Array.isArray(s.messages) && s.messages.length > 0
      ? { minimizedMessages: s.messages.slice(-30) }
      : {}),
  }));
}

function deserializeOne(row: PopupReturnSerializedSession): ChatSession {
  const fromRowSelected =
    row.selectedDialogId != null &&
    String(row.selectedDialogId) !== '' &&
    String(row.selectedDialogId) !== '0' &&
    String(row.selectedDialogId) !== 'assigned'
      ? row.selectedDialogId
      : null;
  const fromAssigned =
    row.assignedDialogId != null &&
    String(row.assignedDialogId) !== '' &&
    String(row.assignedDialogId) !== '0' &&
    String(row.assignedDialogId) !== 'assigned'
      ? row.assignedDialogId
      : null;
  const selectedDialogId = fromRowSelected ?? fromAssigned;
  const selectedDialog =
    selectedDialogId != null &&
    String(selectedDialogId) !== '' &&
    String(selectedDialogId) !== '0' &&
    String(selectedDialogId) !== 'assigned'
      ? {
          id:
            typeof selectedDialogId === 'number'
              ? selectedDialogId
              : Number.isFinite(Number(selectedDialogId))
                ? Number(selectedDialogId)
                : selectedDialogId,
        }
      : null;

  const handoffMessages =
    Array.isArray(row.minimizedMessages) && row.minimizedMessages.length > 0
      ? row.minimizedMessages
      : [];

  return {
    id: row.id,
    dialogs: [],
    messages: handoffMessages,
    selectedDialog,
    isMinimized: Boolean(row.isMinimized),
    selectedUsers: Array.isArray(row.selectedUsers) ? [...row.selectedUsers] : [],
    selectedUserName: row.selectedUserName ?? '',
    messageText: '',
    usersCache: new Map(),
    isDialogEnded: false,
    isUsersTouched: (row.selectedUsers?.length ?? 0) > 0,
    hasSentMessage: false,
    clearMessageInput: false,
    uploadedAttachments: [],
    hasLoadedDialogs: false,
    pendingAttachments: [],
    isSendingMessage: false,
    lastSendError: null,
    assignedDialogId: row.assignedDialogId ?? null,
    transferRecipientFullName: null,
    unreadDialogs: Array.isArray(row.unreadDialogs) ? row.unreadDialogs : [],
    isLoadingUnreadDialogs: false,
    unreadCount: row.unreadCount,
    totalUnreadCount: row.totalUnreadCount,
  };
}

export function deserializeSessionsForMainRestore(
  rows: PopupReturnSerializedSession[],
): ChatSession[] {
  return rows.map(deserializeOne);
}

function makeMinimizedSnapshotSession(entry: OperatorPopupPreviewSnapshotEntry): ChatSession {
  const selectedDialogId = entry.kind === 'unread' ? entry.dialog.id : null;
  const ownerId = entry.kind === 'unread' ? entry.dialog.owner?.id : undefined;
  return deserializeOne({
    id: entry.sessionId,
    isMinimized: true,
    selectedUsers: ownerId ? [ownerId] : [],
    selectedUserName: entry.title,
    selectedDialogId,
    assignedDialogId: selectedDialogId != null ? String(selectedDialogId) : null,
    unreadDialogs: entry.kind === 'unread' ? [entry.dialog] : [],
    unreadCount: entry.unread,
    totalUnreadCount: entry.unread,
  });
}

function mergePreviewSnapshotIntoSessions(sessions: ChatSession[]): ChatSession[] {
  const snapshot = readOperatorPopupPreviewSnapshot();
  if (snapshot.length === 0) return sessions;

  let next = sessions;
  for (const entry of snapshot) {
    const existingIndex = next.findIndex((session) => session.id === entry.sessionId);
    if (existingIndex >= 0) {
      if (entry.kind !== 'unread') continue;
      next = next.map((session, index) => {
        if (index !== existingIndex) return session;
        const alreadyHasDialog = session.unreadDialogs?.some((dialog) => dialog.id === entry.dialog.id);
        return {
          ...session,
          unreadDialogs: alreadyHasDialog
            ? session.unreadDialogs
            : [...(session.unreadDialogs ?? []), entry.dialog],
        };
      });
      continue;
    }

    next = [...next, makeMinimizedSnapshotSession(entry)];
  }

  return next;
}

function parseHandoffJson(raw: string): PopupReturnHandoffPayload | null {
  try {
    const p = JSON.parse(raw) as PopupReturnHandoffPayload;
    if (p && p.v === 2 && typeof p.isChatOpen === 'boolean' && Array.isArray(p.sessions)) {
      return p;
    }
    if (p && p.v === 1 && typeof p.isChatOpen === 'boolean') {
      return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Чтение без удаления: sessionStorage (handoff от opener) или дубль в localStorage. */
export function peekMainReturnHandoffPayload(): PopupReturnHandoffPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = sessionStorage.getItem(CHAT_MAIN_POPUP_RETURN_HANDOFF_SESSION_KEY);
    if (s) {
      const parsed = parseHandoffJson(s);
      if (parsed) return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const s = localStorage.getItem(CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY);
    if (s) {
      const parsed = parseHandoffJson(s);
      if (parsed) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export type InitialSessionsHydration = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  /** Сессии пришли из основной вкладки при открытии popup — нужен fetch истории в popup. */
  fromMainToPopup: boolean;
};

export type DesktopSocketUnreadHandoff = {
  v: 1;
  aggregateUnread: number;
  dialogs: Record<string, number>;
  /** sessionId → unreadCount на момент handoff (если WS-карта ещё не успела). */
  sessionUnread?: Record<string, number>;
};

let desktopUnreadHandoffMem: {
  aggregateUnread: number;
  dialogsUnreadCounts: Map<number, number>;
  sessionUnread: Map<string, number>;
} | null = null;

function isElectronMainWindowForHandoff(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as { alcolockDesktop?: unknown }).alcolockDesktop) &&
    !window.location.pathname.includes('/operator-chat-popup')
  );
}

function parseDesktopSocketUnreadHandoffRaw(raw: string | null): {
  aggregateUnread: number;
  dialogsUnreadCounts: Map<number, number>;
  sessionUnread: Map<string, number>;
} | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DesktopSocketUnreadHandoff;
    if (!parsed || parsed.v !== 1 || typeof parsed.dialogs !== 'object') return null;
    const map = new Map<number, number>();
    Object.entries(parsed.dialogs).forEach(([id, count]) => {
      const dialogId = Number(id);
      const n = Number(count);
      if (Number.isFinite(dialogId) && dialogId > 0 && Number.isFinite(n) && n > 0) {
        map.set(dialogId, n);
      }
    });
    const sessionUnread = new Map<string, number>();
    if (parsed.sessionUnread && typeof parsed.sessionUnread === 'object') {
      Object.entries(parsed.sessionUnread).forEach(([sessionId, count]) => {
        const n = Number(count);
        if (sessionId && Number.isFinite(n) && n > 0) {
          sessionUnread.set(sessionId, n);
        }
      });
    }
    return {
      aggregateUnread: Math.max(0, Number(parsed.aggregateUnread) || 0),
      dialogsUnreadCounts: map,
      sessionUnread,
    };
  } catch {
    return null;
  }
}

export function persistDesktopSocketUnreadHandoff(args: {
  aggregateUnread: number;
  dialogsUnreadCounts: Map<number, number>;
  sessions?: ChatSession[];
}): void {
  if (typeof window === 'undefined') return;
  const dialogs: Record<string, number> = {};
  args.dialogsUnreadCounts.forEach((count, dialogId) => {
    if (dialogId > 0 && count > 0) {
      dialogs[String(dialogId)] = count;
    }
  });
  const sessionUnread: Record<string, number> = {};
  (args.sessions ?? []).forEach((session) => {
    const n = Number(session.unreadCount ?? session.totalUnreadCount ?? 0);
    if (session.isMinimized && Number.isFinite(n) && n > 0) {
      sessionUnread[session.id] = n;
    }
  });
  const payload: DesktopSocketUnreadHandoff = {
    v: 1,
    aggregateUnread: Math.max(0, args.aggregateUnread),
    dialogs,
    sessionUnread,
  };
  const parsed = parseDesktopSocketUnreadHandoffRaw(JSON.stringify(payload));
  if (parsed) {
    desktopUnreadHandoffMem = parsed;
  }
  try {
    localStorage.setItem(CHAT_DESKTOP_SOCKET_UNREAD_HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function peekDesktopSocketUnreadHandoff(): {
  aggregateUnread: number;
  dialogsUnreadCounts: Map<number, number>;
  sessionUnread: Map<string, number>;
} | null {
  if (desktopUnreadHandoffMem) {
    return desktopUnreadHandoffMem;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHAT_DESKTOP_SOCKET_UNREAD_HANDOFF_KEY);
    const parsed = parseDesktopSocketUnreadHandoffRaw(raw);
    if (parsed) {
      desktopUnreadHandoffMem = parsed;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDesktopSocketUnreadHandoffMarker(): void {
  desktopUnreadHandoffMem = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHAT_DESKTOP_SOCKET_UNREAD_HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

export function persistMainToOperatorPopupHandoff(args: {
  isChatOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  aggregateUnread?: number;
  dialogsUnreadCounts?: Map<number, number>;
}): void {
  if (typeof window === 'undefined') return;
  const { isChatOpen, sessions, activeSessionId, aggregateUnread, dialogsUnreadCounts } = args;
  const ser = serializeSessionsForPopupHandoff(sessions);
  const payload: PopupReturnHandoffPayload = {
    v: 2,
    isChatOpen,
    activeSessionId,
    sessions: ser,
  };
  try {
    localStorage.setItem(CHAT_MAIN_TO_OPERATOR_POPUP_HANDOFF_LOCAL_KEY, JSON.stringify(payload));
    localStorage.setItem(
      CHAT_OPERATOR_POPUP_PREVIEW_SNAPSHOT_KEY,
      JSON.stringify(buildOperatorPopupPreviewSnapshot(sessions)),
    );
    if (dialogsUnreadCounts) {
      persistDesktopSocketUnreadHandoff({
        aggregateUnread: aggregateUnread ?? 0,
        dialogsUnreadCounts,
        sessions,
      });
    }
  } catch {
    /* ignore */
  }
}

export function readOperatorPopupPreviewSnapshot(): OperatorPopupPreviewSnapshotEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHAT_OPERATOR_POPUP_PREVIEW_SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OperatorPopupPreviewSnapshotEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry.key === 'string');
  } catch {
    return [];
  }
}

function deserializeMainToOperatorPopupHandoffRaw(raw: string | null): InitialSessionsHydration {
  if (!raw) {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
  try {
    const p = parseHandoffJson(raw);
    if (!p || p.v !== 2 || !Array.isArray(p.sessions) || p.sessions.length === 0) {
      return { sessions: [], activeSessionId: null, fromMainToPopup: false };
    }
    const sessions = mergePreviewSnapshotIntoSessions(deserializeSessionsForMainRestore(p.sessions));
    let active = p.activeSessionId ?? null;
    if (active && !sessions.some((s) => s.id === active)) {
      const firstExpanded = sessions.find((s) => !s.isMinimized);
      active = firstExpanded?.id ?? sessions[0]?.id ?? null;
    }
    return { sessions, activeSessionId: active, fromMainToPopup: true };
  } catch {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
}

/**
 * Только чтение (без удаления): для init ChatProvider в /operator-chat-popup.
 * Иначе при React Strict Mode первый mount съедает localStorage, второй получает пустые сессии.
 */
export function peekMainToOperatorPopupHandoff(): InitialSessionsHydration {
  if (typeof window === 'undefined') {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
  if (!window.location.pathname.includes('/operator-chat-popup')) {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
  try {
    const raw = localStorage.getItem(CHAT_MAIN_TO_OPERATOR_POPUP_HANDOFF_LOCAL_KEY);
    return deserializeMainToOperatorPopupHandoffRaw(raw);
  } catch {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
}

/** Читает и удаляет handoff «основная → popup» (если понадобится императивно). */
export function consumeMainToOperatorPopupHandoff(): InitialSessionsHydration {
  const data = peekMainToOperatorPopupHandoff();
  clearMainToOperatorPopupHandoffMarker();
  return data;
}

export function hasPendingMainToOperatorPopupHandoff(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.location.pathname.includes('/operator-chat-popup')) return false;
  try {
    return localStorage.getItem(CHAT_MAIN_TO_OPERATOR_POPUP_HANDOFF_LOCAL_KEY) != null;
  } catch {
    return false;
  }
}

export function clearMainToOperatorPopupHandoffMarker(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHAT_MAIN_TO_OPERATOR_POPUP_HANDOFF_LOCAL_KEY);
    clearDesktopSocketUnreadHandoffMarker();
  } catch {
    /* ignore */
  }
}

export function getChatProviderInitialSessionsHydration(): InitialSessionsHydration {
  if (typeof window === 'undefined') {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
  if (window.location.pathname.includes('/operator-chat-popup')) {
    return peekMainToOperatorPopupHandoff();
  }
  return getMainWindowInitialSessionsFromHandoff();
}

export function getMainWindowInitialSessionsFromHandoff(): InitialSessionsHydration {
  if (typeof window === 'undefined') {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
  if (window.location.pathname.includes('/operator-chat-popup')) {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
  const p = peekMainReturnHandoffPayload();
  if (!p || p.v !== 2 || !Array.isArray(p.sessions) || p.sessions.length === 0) {
    return { sessions: [], activeSessionId: null, fromMainToPopup: false };
  }
  const sessions = deserializeSessionsForMainRestore(p.sessions);
  let active = p.activeSessionId ?? null;
  if (active && !sessions.some((s) => s.id === active)) {
    const firstExpanded = sessions.find((s) => !s.isMinimized);
    active = firstExpanded?.id ?? sessions[0]?.id ?? null;
  }
  return { sessions, activeSessionId: active, fromMainToPopup: false };
}

export function persistMainRestoreFromPopupState(args: {
  isChatOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
}): void {
  if (typeof window === 'undefined') return;
  const { isChatOpen, sessions, activeSessionId } = args;
  const ser = serializeSessionsForPopupHandoff(sessions);
  const payload: PopupReturnHandoffPayload = {
    v: 2,
    isChatOpen,
    activeSessionId,
    sessions: ser,
  };
  const json = JSON.stringify(payload);
  const payloadShort = isChatOpen ? '1' : '0';

  try {
    localStorage.setItem(CHAT_MAIN_RESTORE_IS_CHAT_OPEN_FROM_POPUP_KEY, payloadShort);
  } catch {
    /* ignore */
  }

  try {
    const opener = window.opener as (Window & typeof globalThis) | null;
    if (opener && opener !== window) {
      opener.sessionStorage.setItem(CHAT_MAIN_POPUP_RETURN_HANDOFF_SESSION_KEY, json);
      try {
        localStorage.setItem(CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY, json);
      } catch {
        /* ignore */
      }
      if (isChatOpen) {
        opener.sessionStorage.setItem(CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_SESSION_KEY, '1');
      } else {
        opener.sessionStorage.removeItem(CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_SESSION_KEY);
      }
    } else {
      try {
        localStorage.setItem(CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY, json);
      } catch {
        /* ignore */
      }
      if (isChatOpen) {
        try {
          localStorage.setItem(CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_LOCAL_KEY, '1');
        } catch {
          /* ignore */
        }
      } else {
        try {
          localStorage.removeItem(CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_LOCAL_KEY);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

/** Удаляет handoff/localStorage после того, как основное окно применило начальное состояние. */
export function clearMainRestoreHandoffMarkers(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CHAT_MAIN_POPUP_RETURN_HANDOFF_SESSION_KEY);
    localStorage.removeItem(CHAT_MAIN_RESTORE_IS_CHAT_OPEN_FROM_POPUP_KEY);
    localStorage.removeItem(CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY);
    localStorage.removeItem(CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Снимает маркеры без чтения (например перед открытием нового popup). */
export function clearMainRestoreIsChatOpenFromPopup(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHAT_MAIN_RESTORE_IS_CHAT_OPEN_FROM_POPUP_KEY);
    localStorage.removeItem(CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY);
    localStorage.removeItem(CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_LOCAL_KEY);
    sessionStorage.removeItem(CHAT_MAIN_POPUP_RETURN_HANDOFF_SESSION_KEY);
    sessionStorage.removeItem(CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Только чтение (без удаления): для useState init в основной вкладке.
 */
export function peekMainRestoreIsChatOpenForMainWindow(): boolean | null {
  const p = peekMainReturnHandoffPayload();
  if (p) {
    if (p.v === 2 || p.v === 1) return p.isChatOpen;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHAT_MAIN_RESTORE_IS_CHAT_OPEN_FROM_POPUP_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  return null;
}

export function hasPendingMainRestoreHandoff(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      sessionStorage.getItem(CHAT_MAIN_POPUP_RETURN_HANDOFF_SESSION_KEY) != null ||
      localStorage.getItem(CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY) != null ||
      localStorage.getItem(CHAT_MAIN_RESTORE_IS_CHAT_OPEN_FROM_POPUP_KEY) != null
    );
  } catch {
    return false;
  }
}
