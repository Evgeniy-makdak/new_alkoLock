/** Снимок внешней геометрии popup-окна чата (задаётся при window.open, восстанавливается при resize ОС). */
export type OperatorChatPopupFrameLock = {
  outerW: number;
  outerH: number;
  left: number;
  top: number;
};

export const OPERATOR_CHAT_POPUP_FRAME_LOCK_SESSION_KEY =
  'alcolock_operator_chat_popup_frame_lock_v1';

export function writeOperatorChatPopupFrameLock(lock: OperatorChatPopupFrameLock): void {
  try {
    sessionStorage.setItem(OPERATOR_CHAT_POPUP_FRAME_LOCK_SESSION_KEY, JSON.stringify(lock));
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
