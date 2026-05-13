/** Отдельные ключи от основной вкладки: при каждом открытии popup очищаются — размеры/позиция dock снова дефолтные. */
export const CHAT_POPUP_PANEL_W_STORAGE_KEY = 'alcolock_operator_chat_popup_panel_w_v1';
export const CHAT_POPUP_PANEL_H_STORAGE_KEY = 'alcolock_operator_chat_popup_panel_h_v1';
export const CHAT_POPUP_DOCK_R_STORAGE_KEY = 'alcolock_operator_chat_popup_dock_r_v1';
export const CHAT_POPUP_DOCK_B_STORAGE_KEY = 'alcolock_operator_chat_popup_dock_b_v1';

const MAIN_PANEL_W = 'alcolock_chat_panel_w_v1';
const MAIN_PANEL_H = 'alcolock_chat_panel_h_v1';
const MAIN_DOCK_R = 'alcolock_chat_dock_r_v1';
const MAIN_DOCK_B = 'alcolock_chat_dock_b_v1';

export type ChatPanelDockStorageKeys = {
  panelW: string;
  panelH: string;
  dockR: string;
  dockB: string;
};

export function chatPanelDockStorageKeys(isOperatorChatPopup: boolean): ChatPanelDockStorageKeys {
  if (isOperatorChatPopup) {
    return {
      panelW: CHAT_POPUP_PANEL_W_STORAGE_KEY,
      panelH: CHAT_POPUP_PANEL_H_STORAGE_KEY,
      dockR: CHAT_POPUP_DOCK_R_STORAGE_KEY,
      dockB: CHAT_POPUP_DOCK_B_STORAGE_KEY,
    };
  }
  return {
    panelW: MAIN_PANEL_W,
    panelH: MAIN_PANEL_H,
    dockR: MAIN_DOCK_R,
    dockB: MAIN_DOCK_B,
  };
}

/** Вызывать перед window.open: новое окно чата всегда с дефолтными размерами/отступами dock. */
export function clearOperatorChatPopupLayoutStorage(): void {
  try {
    localStorage.removeItem(CHAT_POPUP_PANEL_W_STORAGE_KEY);
    localStorage.removeItem(CHAT_POPUP_PANEL_H_STORAGE_KEY);
    localStorage.removeItem(CHAT_POPUP_DOCK_R_STORAGE_KEY);
    localStorage.removeItem(CHAT_POPUP_DOCK_B_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
