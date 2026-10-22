import { isElectronChatShell } from './chatShellEnvironment';

/** Снимок внешней геометрии popup-окна чата (задаётся при window.open, восстанавливается при resize ОС). */
export type OperatorChatPopupFrameLock = {
  outerW: number;
  outerH: number;
  left: number;
  top: number;
};

export const OPERATOR_CHAT_POPUP_FRAME_LOCK_SESSION_KEY =
  'alcolock_operator_chat_popup_frame_lock_v1';

/**
 * ТОЛЬКО Электрон: геометрия закреплённого окна в localStorage — переживает закрытие
 * окна (sessionStorage умирает вместе с BrowserWindow). Используется при повторном
 * открытии, чтобы popup вернулся на то же место/размер, где был закреплён и закрыт.
 */
export const OPERATOR_CHAT_POPUP_PINNED_FRAME_STORAGE_KEY =
  'alcolock_operator_chat_popup_pinned_frame_v1';

export function writeOperatorChatPopupFrameLock(lock: OperatorChatPopupFrameLock): void {
  try {
    sessionStorage.setItem(OPERATOR_CHAT_POPUP_FRAME_LOCK_SESSION_KEY, JSON.stringify(lock));
  } catch {
    /* ignore */
  }
  // ТОЛЬКО Электрон: дублируем геометрию в localStorage независимо от текущего
  // значения флага закрепа. sessionStorage умирает при закрытии BrowserWindow —
  // закреплённая геометрия должна пережить окно.
  //
  // Проверка флага здесь была ошибкой: handleToggleChatLayoutPin вызывает этот метод
  // ДО установки alcolock_operator_chat_popup_layout_pinned_v1, поэтому при ПЕРВОМ
  // закрепе геометрия не попадала в localStorage — после закрытия окно повторно
  // открывалось в дефолтной позиции. Читающая сторона (openOperatorChatPopup) сама
  // сверяется с readChatLayoutPinned(true), поэтому лишняя запись при незакреплённом
  // layout безопасна (при следующем открытии игнорируется/очищается).
  // Браузер/PWA (isElectronChatShell=false) не затрагиваются.
  try {
    if (isElectronChatShell()) {
      localStorage.setItem(OPERATOR_CHAT_POPUP_PINNED_FRAME_STORAGE_KEY, JSON.stringify(lock));
    }
  } catch {
    /* ignore */
  }
}

export function readOperatorChatPopupFrameLock(): OperatorChatPopupFrameLock | null {
  try {
    const raw = sessionStorage.getItem(OPERATOR_CHAT_POPUP_FRAME_LOCK_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OperatorChatPopupFrameLock;
    if (
      !Number.isFinite(parsed.outerW) ||
      !Number.isFinite(parsed.outerH) ||
      !Number.isFinite(parsed.left) ||
      !Number.isFinite(parsed.top)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Закреплённая геометрия (Electron): сохранить в localStorage. */
export function writeOperatorChatPopupPinnedFrame(lock: OperatorChatPopupFrameLock): void {
  try {
    localStorage.setItem(OPERATOR_CHAT_POPUP_PINNED_FRAME_STORAGE_KEY, JSON.stringify(lock));
  } catch {
    /* ignore */
  }
}

/** Закреплённая геометрия (Electron): прочитать из localStorage. */
export function readOperatorChatPopupPinnedFrame(): OperatorChatPopupFrameLock | null {
  try {
    const raw = localStorage.getItem(OPERATOR_CHAT_POPUP_PINNED_FRAME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OperatorChatPopupFrameLock;
    if (
      !Number.isFinite(parsed.outerW) ||
      !Number.isFinite(parsed.outerH) ||
      !Number.isFinite(parsed.left) ||
      !Number.isFinite(parsed.top)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Закреплённая геометрия (Electron): очистить при снятии закрепа. */
export function clearOperatorChatPopupPinnedFrame(): void {
  try {
    localStorage.removeItem(OPERATOR_CHAT_POPUP_PINNED_FRAME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
