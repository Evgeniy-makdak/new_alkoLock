import {
  POPUP_DOCK_PANEL_H_PX,
  POPUP_DOCK_PANEL_W_PX,
  getOperatorChatPopupMinInnerSize,
  getOperatorChatPopupMinOuterSize,
} from './operatorChatPopupLayout';
import { chatPanelDockStorageKeys } from './popupLayoutStorage';

function readSavedPopupPanel(): { w: number; h: number } {
  if (typeof window === 'undefined') {
    return { w: POPUP_DOCK_PANEL_W_PX, h: POPUP_DOCK_PANEL_H_PX };
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
  return { w: POPUP_DOCK_PANEL_W_PX, h: POPUP_DOCK_PANEL_H_PX };
}

type EstimateOperatorChatPopupSizeOptions = {
  includePreviewColumn?: boolean;
};

/** Внутренние размеры для window.open. */
export function estimateOperatorChatPopupInnerSize(
  options: EstimateOperatorChatPopupSizeOptions = {},
): { innerW: number; innerH: number } {
  const { w: pw, h: ph } = readSavedPopupPanel();
  const min = getOperatorChatPopupMinInnerSize(pw, options);
  return {
    innerW: min.innerW,
    innerH: Math.max(ph, min.innerH),
  };
}

/** Внешние размеры окна при открытии. */
export function estimateOperatorChatPopupOuterSize(
  options: EstimateOperatorChatPopupSizeOptions = {},
): { outerW: number; outerH: number } {
  const { w: pw } = readSavedPopupPanel();
  return getOperatorChatPopupMinOuterSize(pw, options);
}
