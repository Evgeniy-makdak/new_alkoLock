import { chatPanelDockStorageKeys } from './popupLayoutStorage';

/**
 * Ключи `chatPanelDockStorageKeys(true)` — отдельно от основной вкладки; перед открытием очищаются в openOperatorChatPopup.
 * Оценка стартового окна до монтирования React; точная подгонка — useOperatorChatPopupWindowFrame.
 */
const DEFAULT_PANEL_W = 520;
const DEFAULT_PANEL_H = 660;
const DOCK_FAB_COLUMN_W_PX = 56;
const MINIMIZED_PREVIEW_GAP_PX = 28;
const PREVIEW_COL_W_PX = 260;
const DOCK_FAB_STACK_H_PX = 196;
const INITIAL_PAD_PX = 16;

function readSavedPopupPanel(): { w: number; h: number } {
  if (typeof window === 'undefined') {
    return { w: DEFAULT_PANEL_W, h: DEFAULT_PANEL_H };
  }
  const k = chatPanelDockStorageKeys(true);
  try {
    const w = parseInt(localStorage.getItem(k.panelW) || '', 10);
    const h = parseInt(localStorage.getItem(k.panelH) || '', 10);
    if (Number.isFinite(w) && Number.isFinite(h)) {
      return { w, h };
    }
  } catch {
    /* ignore */
  }
  return { w: DEFAULT_PANEL_W, h: DEFAULT_PANEL_H };
}

/** Внутренние размеры контента (innerWidth/innerHeight окна) для первого открытия. */
export function estimateOperatorChatPopupInnerSize(): { innerW: number; innerH: number } {
  const { w: pw, h: ph } = readSavedPopupPanel();
  const innerW =
    pw + DOCK_FAB_COLUMN_W_PX + 2 * MINIMIZED_PREVIEW_GAP_PX + PREVIEW_COL_W_PX + INITIAL_PAD_PX;
  const innerH = Math.max(ph, DOCK_FAB_STACK_H_PX) + INITIAL_PAD_PX;
  return { innerW, innerH };
}
