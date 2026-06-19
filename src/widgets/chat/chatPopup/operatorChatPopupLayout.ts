import { OPERATOR_CHAT_POPUP_DOCK_SELECTOR, OPERATOR_CHAT_POPUP_PREVIEW_SELECTOR } from './constants';

/** Определяем браузер */
function isChromeUa(): boolean {
  return typeof navigator !== 'undefined' && /Chrome\//i.test(navigator.userAgent) && !/Edg\//i.test(navigator.userAgent);
}

/** Отступ dock от краёв viewport в отдельном окне (в основной вкладке — 80px). */
export const OPERATOR_CHAT_POPUP_DOCK_EDGE_MARGIN_PX = 12;

export const OPERATOR_CHAT_POPUP_VIEWPORT_PAD_PX = 16;

/** Синхронно с ChatFooter / estimateOperatorChatPopupWindowSize. */
export const POPUP_DOCK_PANEL_W_PX = 610;
export const POPUP_DOCK_FAB_COLUMN_W_PX = 56;
export const POPUP_MINIMIZED_PREVIEW_GAP_PX = 28;
/** Синхронно с .minimizedChat { width: 260px }; без большого запаса, чтобы wrapper не оставлял пустое поле. */
export const POPUP_PREVIEW_COL_W_PX = 260;
/** Высота колонки FAB: 3 кнопки (toggle, new chat, return) по 56px + 2 gap по 10px + запас = 210px */
export const POPUP_DOCK_FAB_STACK_H_PX = 280;
export const POPUP_DOCK_PANEL_H_PX = 660;
/** Доп. ширина inner, чтобы превью слева не обрезались. */
export const POPUP_EXTRA_INNER_WIDTH_BUFFER_PX = 64;

type OperatorChatPopupSizeOptions = {
  includePreviewColumn?: boolean;
};

/** Единый padding chrome для всех браузеров */
/** Фиксированные значения chrome для всех браузеров */
export const POPUP_CHROME_WIDTH_PX = 20;
export const POPUP_CHROME_HEIGHT_PX = 72;

/** Единый padding chrome для всех браузеров — фиксированные значения */
export function getOperatorChatPopupChromePadding(): { w: number; h: number } {
  // Для Chrome убираем chrome padding — там и так минимальные отступы
  if (isChromeUa()) {
    return { w: 0, h: 0 };
  }
  return { w: POPUP_CHROME_WIDTH_PX, h: POPUP_CHROME_HEIGHT_PX };
}

/** Минимальный innerWidth/innerHeight: панель + FAB, колонка превью добавляется только когда нужна. */
export function getOperatorChatPopupMinInnerSize(
  panelW = POPUP_DOCK_PANEL_W_PX,
  options: OperatorChatPopupSizeOptions = {},
): {
  innerW: number;
  innerH: number;
} {
  const edge = OPERATOR_CHAT_POPUP_DOCK_EDGE_MARGIN_PX;
  const includePreviewColumn = options.includePreviewColumn ?? false;
  const gapW = includePreviewColumn
    ? 2 * POPUP_MINIMIZED_PREVIEW_GAP_PX
    : POPUP_MINIMIZED_PREVIEW_GAP_PX;
  const sidePad = 2 * edge + OPERATOR_CHAT_POPUP_VIEWPORT_PAD_PX;
  const extraW = includePreviewColumn ? 8 : Math.floor(POPUP_EXTRA_INNER_WIDTH_BUFFER_PX / 2);
  const innerW =
    panelW +
    POPUP_DOCK_FAB_COLUMN_W_PX +
    gapW +
    (includePreviewColumn ? POPUP_PREVIEW_COL_W_PX : 0) +
    sidePad +
    extraW;
  const innerH =
    Math.max(POPUP_DOCK_PANEL_H_PX, POPUP_DOCK_FAB_STACK_H_PX) +
    2 * edge +
    OPERATOR_CHAT_POPUP_VIEWPORT_PAD_PX;
  return { innerW, innerH };
}

export function getOperatorChatPopupMinOuterSize(
  panelW = POPUP_DOCK_PANEL_W_PX,
  options: OperatorChatPopupSizeOptions = {},
): {
  outerW: number;
  outerH: number;
} {
  const { innerW, innerH } = getOperatorChatPopupMinInnerSize(panelW, options);
  const chrome = getOperatorChatPopupChromePadding();
  return { outerW: innerW + chrome.w, outerH: innerH + chrome.h };
}

export function measureOperatorChatPopupDockOuterSize(dock: Element): {
  outerW: number;
  outerH: number;
  leftOverflowPx: number;
} {
  const previewCount = Number(dock.getAttribute('data-operator-chat-preview-count') || 0);
  const hasPreview = previewCount > 0;
  
  // Получаем rectы dock и всех preview элементов
  const rects = [
    dock.getBoundingClientRect(),
    ...Array.from(document.querySelectorAll(OPERATOR_CHAT_POPUP_PREVIEW_SELECTOR)).map((node) =>
      node.getBoundingClientRect(),
    ),
  ].filter((rect) => rect.width > 0 && rect.height > 0);
  
  // Защита от пустых rect
  if (rects.length === 0) {
    const min = getOperatorChatPopupMinOuterSize(undefined, {
      includePreviewColumn: false,
    });
    return {
      outerW: min.outerW,
      outerH: min.outerH,
      leftOverflowPx: 0,
    };
  }
  
  // Для Chrome используем меньший pad
  const pad = isChromeUa() ? 8 : OPERATOR_CHAT_POPUP_VIEWPORT_PAD_PX;
  
  // Находим границы ВСЕХ элементов (dock + preview)
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  const leftOverflow = Math.max(0, -left);
  
  // РАСЧЁТ РАЗМЕРОВ: используем height/width rect, а не absolute coordinates
  // Это работает одинаково во всех браузерах
  const contentWidth = right - left;
  const contentHeight = bottom - top;
  
  const measuredWidth = Math.ceil(contentWidth) + pad * 2;
  const innerH = Math.ceil(contentHeight) + pad;
  
  const min = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn: false });
  const minWithPreview = hasPreview
    ? getOperatorChatPopupMinOuterSize(undefined, {
        includePreviewColumn: true,
      })
    : min;
  const chrome = getOperatorChatPopupChromePadding();
  const minMeasuredOuterH =
    Math.max(500, POPUP_DOCK_FAB_STACK_H_PX + 2 * OPERATOR_CHAT_POPUP_DOCK_EDGE_MARGIN_PX + pad) +
    chrome.h;
  return {
    outerW: Math.max(minWithPreview.outerW, measuredWidth + chrome.w),
    outerH: Math.max(minMeasuredOuterH, innerH + chrome.h),
    leftOverflowPx: leftOverflow,
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
