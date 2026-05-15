import { OPERATOR_CHAT_POPUP_DOCK_SELECTOR } from './constants';

/** Отступ dock от краёв viewport в отдельном окне (в основной вкладке — 80px). */
export const OPERATOR_CHAT_POPUP_DOCK_EDGE_MARGIN_PX = 12;

export const OPERATOR_CHAT_POPUP_VIEWPORT_PAD_PX = 16;

/** Синхронно с ChatFooter / estimateOperatorChatPopupWindowSize. */
export const POPUP_DOCK_PANEL_W_PX = 520;
export const POPUP_DOCK_FAB_COLUMN_W_PX = 56;
export const POPUP_MINIMIZED_PREVIEW_GAP_PX = 28;
/** .minimizedChat { width: 260px } + запас под тень/скролл */
export const POPUP_PREVIEW_COL_W_PX = 280;
export const POPUP_DOCK_FAB_STACK_H_PX = 196;
export const POPUP_DOCK_PANEL_H_PX = 660;
/** Доп. ширина inner, чтобы превью слева не обрезались. */
export const POPUP_EXTRA_INNER_WIDTH_BUFFER_PX = 64;
/** Firefox часто открывает popup уже features и недооценивает chrome по ширине. */
export const POPUP_FIREFOX_EXTRA_INNER_WIDTH_BUFFER_PX = 96;
export const POPUP_FIREFOX_MIN_OUTER_WIDTH_PX = 1120;

function isFirefoxUa(): boolean {
  return typeof navigator !== 'undefined' && /Firefox\//i.test(navigator.userAgent);
}

export function getOperatorChatPopupChromePadding(): { w: number; h: number } {
  if (typeof navigator === 'undefined') {
    return { w: 20, h: 72 };
  }
  const ua = navigator.userAgent;
  if (/Firefox\//i.test(ua)) {
    return { w: 40, h: 112 };
  }
  if (/Edg\//i.test(ua)) {
    return { w: 28, h: 96 };
  }
  return { w: 20, h: 72 };
}

/** Минимальный innerWidth/innerHeight: панель + FAB + колонка превью (всегда закладываем). */
export function getOperatorChatPopupMinInnerSize(panelW = POPUP_DOCK_PANEL_W_PX): {
  innerW: number;
  innerH: number;
} {
  const edge = OPERATOR_CHAT_POPUP_DOCK_EDGE_MARGIN_PX;
  const extraW =
    POPUP_EXTRA_INNER_WIDTH_BUFFER_PX +
    (isFirefoxUa() ? POPUP_FIREFOX_EXTRA_INNER_WIDTH_BUFFER_PX : 0);
  const innerW =
    panelW +
    POPUP_DOCK_FAB_COLUMN_W_PX +
    2 * POPUP_MINIMIZED_PREVIEW_GAP_PX +
    POPUP_PREVIEW_COL_W_PX +
    2 * edge +
    OPERATOR_CHAT_POPUP_VIEWPORT_PAD_PX +
    extraW;
  const innerH =
    Math.max(POPUP_DOCK_PANEL_H_PX, POPUP_DOCK_FAB_STACK_H_PX) +
    2 * edge +
    OPERATOR_CHAT_POPUP_VIEWPORT_PAD_PX;
  return { innerW, innerH };
}

export function getOperatorChatPopupMinOuterSize(panelW = POPUP_DOCK_PANEL_W_PX): {
  outerW: number;
  outerH: number;
} {
  const { innerW, innerH } = getOperatorChatPopupMinInnerSize(panelW);
  const chrome = getOperatorChatPopupChromePadding();
  let outerW = innerW + chrome.w;
  if (isFirefoxUa()) {
    outerW = Math.max(outerW, POPUP_FIREFOX_MIN_OUTER_WIDTH_PX);
  }
  return { outerW, outerH: innerH + chrome.h };
}

export function measureOperatorChatPopupDockOuterSize(dock: Element): {
  outerW: number;
  outerH: number;
} {
  const r = dock.getBoundingClientRect();
  const dx = window.outerWidth - window.innerWidth;
  const dy = window.outerHeight - window.innerHeight;
  const pad = OPERATOR_CHAT_POPUP_VIEWPORT_PAD_PX;
  const innerW = Math.ceil((r.left < 0 ? r.right - r.left : r.right) + pad);
  const innerH = Math.ceil(r.bottom + pad);
  const min = getOperatorChatPopupMinOuterSize();
  return {
    outerW: Math.max(min.outerW, innerW + (Number.isFinite(dx) ? dx : 0)),
    outerH: Math.max(min.outerH, innerH + (Number.isFinite(dy) ? dy : 0)),
  };
}

export function isOperatorChatPopupDockFullyVisible(): boolean {
  const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
  if (!dock) return false;
  const r = dock.getBoundingClientRect();
  const m = 6;
  return (
    r.top >= m &&
    r.left >= m &&
    r.bottom <= window.innerHeight - m &&
    r.right <= window.innerWidth - m
  );
}
