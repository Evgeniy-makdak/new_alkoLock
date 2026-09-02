import { getBearerToken } from '@shared/utils/cookie_manager';

import { DialogsApi, type UnreadDialog } from '../api/dialogsApi';
import { filterDialogsByOwnerInCurrentOperatorBranch } from '../lib/chatBranchGuard';
import { filterUnreadDialogsForCurrentOperator } from '../lib/chatOperatorPermissions';
import { CHAT_POPUP_OPEN_REST_GENERATION_KEY } from './constants';
import { isElectronOperatorChatPopup } from './electronPopupAuth';
import { syncElectronPopupBranchFromStorage } from './electronPopupSessionBootstrap';

/** ChatContext слушает это событие и вызывает forceLoadUnreadDialogs для всех сессий. */
export const ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT = 'alcolock-electron-popup-request-unread-rest';

/**
 * Прямой результат GET dialogs?countMessages — для popup без гонок getSession/forceLoad.
 * ChatContext применяет detail ко всем сессиям и в WS-карту.
 */
export const ELECTRON_POPUP_UNREAD_DIALOGS_LOADED_EVENT =
  'alcolock-electron-popup-unread-dialogs-loaded';

/** Буфер: fetch может завершиться до mount сессий — ChatContext догоняет через peek. */
let lastFetchedUnreadDialogs: UnreadDialog[] | null = null;
let lastFetchedGeneration: string | null = null;

export function peekLastElectronPopupUnreadDialogs(): UnreadDialog[] | null {
  return lastFetchedUnreadDialogs;
}

export function peekLastElectronPopupUnreadDialogsGeneration(): string | null {
  return lastFetchedGeneration;
}

export function clearLastElectronPopupUnreadDialogs(): void {
  lastFetchedUnreadDialogs = null;
  lastFetchedGeneration = null;
}

/** Новое открытие popup из main — сбрасывает «уже загружено» в ChatContext. */
export function markElectronPopupOpenRestGeneration(): void {
  if (typeof window === 'undefined') return;
  clearLastElectronPopupUnreadDialogs();
  try {
    localStorage.setItem(CHAT_POPUP_OPEN_REST_GENERATION_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function readElectronPopupOpenRestGeneration(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CHAT_POPUP_OPEN_REST_GENERATION_KEY);
  } catch {
    return null;
  }
}

export function requestElectronPopupUnreadRest(): void {
  if (typeof window === 'undefined' || !isElectronOperatorChatPopup()) return;
  window.dispatchEvent(new CustomEvent(ELECTRON_POPUP_REQUEST_UNREAD_REST_EVENT));
}

export function broadcastElectronPopupUnreadDialogs(list: UnreadDialog[]): void {
  if (typeof window === 'undefined' || !isElectronOperatorChatPopup()) return;
  const generation = readElectronPopupOpenRestGeneration() ?? 'default';
  lastFetchedUnreadDialogs = list;
  lastFetchedGeneration = generation;
  window.dispatchEvent(
    new CustomEvent(ELECTRON_POPUP_UNREAD_DIALOGS_LOADED_EVENT, { detail: list }),
  );
}

/**
 * Electron popup: тот же REST, что web при открытии чата.
 * null = JWT ещё нет; массив (в т.ч. пустой) = запрос ушёл.
 */
export async function fetchElectronPopupUnreadDialogs(): Promise<UnreadDialog[] | null> {
  if (typeof window === 'undefined' || !isElectronOperatorChatPopup()) return null;
  if (!getBearerToken()) return null;

  syncElectronPopupBranchFromStorage();

  try {
    const response = await DialogsApi.getUnreadDialogs();
    if (response?.isError) return null;
    const list = filterUnreadDialogsForCurrentOperator(
      await filterDialogsByOwnerInCurrentOperatorBranch(
        (response?.data?.content ?? []) as UnreadDialog[],
      ),
    );
    broadcastElectronPopupUnreadDialogs(list);
    return list;
  } catch {
    return null;
  }
}

/** Повтор до успеха: JWT появляется асинхронно в отдельном BrowserWindow. */
export async function fetchElectronPopupUnreadDialogsWithRetry(
  options?: { attempts?: number; delayMs?: number; isMounted?: () => boolean },
): Promise<UnreadDialog[] | null> {
  const attempts = options?.attempts ?? 60;
  const delayMs = options?.delayMs ?? 200;
  const isMounted = options?.isMounted ?? (() => true);

  for (let i = 0; i < attempts; i++) {
    if (!isMounted()) return null;
    const list = await fetchElectronPopupUnreadDialogs();
    if (list !== null) return list;
    await new Promise((r) => window.setTimeout(r, delayMs));
  }
  return null;
}
