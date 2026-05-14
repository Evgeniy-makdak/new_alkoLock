import type { ChatSession } from '../contexts/types/ChatTypes';
import {
  CHAT_MAIN_POPUP_RETURN_HANDOFF_SESSION_KEY,
  CHAT_MAIN_POPUP_RETURN_V2_LOCAL_STORAGE_KEY,
  CHAT_MAIN_RESTORE_IS_CHAT_OPEN_FROM_POPUP_KEY,
  CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_LOCAL_KEY,
  CHAT_MAIN_RESTORE_SKIP_EMPTY_CLOSE_ONCE_SESSION_KEY,
  CHAT_MAIN_TO_OPERATOR_POPUP_HANDOFF_LOCAL_KEY,
} from './constants';

/** Снимок сессии для передачи из popup в основную вкладку (только JSON-поля). */
export type PopupReturnSerializedSession = {
  id: string;
  isMinimized: boolean;
  selectedUsers: number[];
  selectedUserName: string;
  selectedDialogId: string | number | null;
  assignedDialogId: string | null;
};

export type PopupReturnHandoffPayload =
  | { v: 1; isChatOpen: boolean }
  | {
      v: 2;
      isChatOpen: boolean;
      activeSessionId: string | null;
      sessions: PopupReturnSerializedSession[];
    };

export function serializeSessionsForPopupHandoff(
  sessions: ChatSession[],
): PopupReturnSerializedSession[] {
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

  return {
    id: row.id,
    dialogs: [],
    messages: [],
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
    unreadDialogs: [],
    isLoadingUnreadDialogs: false,
  };
}

export function deserializeSessionsForMainRestore(
  rows: PopupReturnSerializedSession[],
): ChatSession[] {
  return rows.map(deserializeOne);
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

export function persistMainToOperatorPopupHandoff(args: {
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
  try {
    localStorage.setItem(CHAT_MAIN_TO_OPERATOR_POPUP_HANDOFF_LOCAL_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
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
    const sessions = deserializeSessionsForMainRestore(p.sessions);
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
