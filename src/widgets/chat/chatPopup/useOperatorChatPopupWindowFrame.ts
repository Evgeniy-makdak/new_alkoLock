import { useEffect } from 'react';

import { isElectronChatShell, isPwaDisplayMode } from './chatShellEnvironment';
import {
  OPERATOR_CHAT_POPUP_DOCK_SELECTOR,
  OPERATOR_CHAT_POPUP_PREVIEW_SELECTOR,
} from './constants';
import {
  type OperatorChatPopupFrameLock,
  readOperatorChatPopupFrameLock,
  writeOperatorChatPopupFrameLock,
} from './operatorChatPopupFrameLock';
import {
  getOperatorChatPopupMinOuterSize,
  measureOperatorChatPopupDockOuterSize,
  OPERATOR_CHAT_POPUP_DOCK_EDGE_MARGIN_PX,
  resolveBottomRightPopupScreenPosition,
} from './operatorChatPopupLayout';
import { readChatLayoutPinned } from './popupLayoutStorage';

const LOCK_TOLERANCE_PX = 8;
const OUTER_SAME_TOLERANCE_PX = 6;
const ZOOM_INNER_RATIO_THRESHOLD = 0.006;
const ZOOM_FACTOR_MAX = 3;
const ABS_MIN_OUTER_W_PX = 300;
const INITIAL_APPLY_MAX_ATTEMPTS = 12;
const INITIAL_APPLY_INTERVAL_MS = 120;
const APPLY_DEBOUNCE_MS = 400;
const SELF_RESIZE_COOLDOWN_MS = 550;

type ViewportSnapshot = { outerW: number; innerW: number };
type ContentOuter = { w: number; h: number };

function captureFrameLock(): OperatorChatPopupFrameLock {
  return {
    outerW: window.outerWidth,
    outerH: window.outerHeight,
    left: window.screenX,
    top: window.screenY,
  };
}

function normalizeLock(raw: OperatorChatPopupFrameLock | null): OperatorChatPopupFrameLock {
  const min = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn: false });
  const base = raw ?? captureFrameLock();
  return {
    outerW: Math.max(base.outerW, min.outerW),
    outerH: Math.max(base.outerH, min.outerH),
    left: base.left,
    top: base.top,
  };
}

/** Ширина-min масштабируется с zoom; высота оболочки — всегда не ниже полной панели. */
function clampOuterSize(
  outerW: number,
  outerH: number,
  zoomFactor = 1,
  includePreviewColumn = false,
): { outerW: number; outerH: number } {
  const min = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn });
  const safeZoom = Math.max(zoomFactor, 0.2);
  const scaledMinW = Math.max(ABS_MIN_OUTER_W_PX, Math.round(min.outerW * safeZoom));
  const minOuterH = min.outerH;
  const scr = window.screen;
  return {
    outerW: Math.min(Math.max(outerW, scaledMinW), scr.availWidth),
    outerH: Math.min(Math.max(outerH, minOuterH), scr.availHeight),
  };
}

function isWidthSatisfied(lock: OperatorChatPopupFrameLock): boolean {
  return window.outerWidth + LOCK_TOLERANCE_PX >= lock.outerW;
}

function hasPreviewInDock(dock: Element): boolean {
  const previewCount = Number(dock.getAttribute('data-operator-chat-preview-count') || 0);
  if (previewCount > 0) return true;
  return document.querySelectorAll(OPERATOR_CHAT_POPUP_PREVIEW_SELECTOR).length > 0;
}

function computeDockOverflowPx(): { growW: number; growH: number } {
  const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
  if (!dock) return { growW: 0, growH: 0 };

  const margin = OPERATOR_CHAT_POPUP_DOCK_EDGE_MARGIN_PX;
  const rects = [
    dock.getBoundingClientRect(),
    ...Array.from(document.querySelectorAll(OPERATOR_CHAT_POPUP_PREVIEW_SELECTOR)).map((node) =>
      node.getBoundingClientRect(),
    ),
  ].filter((rect) => rect.width > 0 && rect.height > 0);

  if (rects.length === 0) return { growW: 0, growH: 0 };

  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return {
    growW: Math.max(0, right - window.innerWidth + margin) + Math.max(0, margin - left),
    growH: Math.max(0, bottom - window.innerHeight + margin),
  };
}

function resolveContentOuterAt100(dock: Element, zoomFactor: number): ContentOuter {
  const includePreview = hasPreviewInDock(dock);
  const minSize = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn: includePreview });
  const measured = measureOperatorChatPopupDockOuterSize(dock);
  const safeZoom = Math.max(zoomFactor, 0.2);

  return {
    w: Math.max(Math.round(measured.outerW / safeZoom), minSize.outerW),
    h: Math.max(Math.round(measured.outerH / safeZoom), minSize.outerH),
  };
}

/** Удерживает popup в пределах экрана; при закреплённом layout сохраняет текущую позицию. */
function resolvePopupScreenPosition(
  outerW: number,
  outerH: number,
  fallback: { left: number; top: number },
): { left: number; top: number } {
  if (isElectronChatShell() && !readChatLayoutPinned(true)) {
    return resolveBottomRightPopupScreenPosition(outerW, outerH);
  }

  const scr = window.screen as Screen & { availLeft?: number; availTop?: number };
  const availLeft = scr.availLeft ?? 0;
  const availTop = scr.availTop ?? 0;
  const margin = OPERATOR_CHAT_POPUP_DOCK_EDGE_MARGIN_PX;

  let nextLeft = fallback.left;
  let nextTop = fallback.top;

  if (nextTop + outerH > availTop + scr.availHeight - margin) {
    nextTop = Math.max(availTop + margin, availTop + scr.availHeight - outerH - margin);
  }
  if (nextLeft + outerW > availLeft + scr.availWidth - margin) {
    nextLeft = Math.max(availLeft + margin, availLeft + scr.availWidth - outerW - margin);
  }
  if (nextTop < availTop + margin) {
    nextTop = availTop + margin;
  }
  if (nextLeft < availLeft + margin) {
    nextLeft = availLeft + margin;
  }

  return { left: nextLeft, top: nextTop };
}

/** В Electron popup `resizable: false` — `window.resizeTo` не меняет окно, нужен IPC setBounds. */
function resizePopupOuter(outerW: number, outerH: number, left?: number, top?: number): void {
  const desktop = window.alcolockDesktop;
  if (desktop?.setPopupBounds) {
    void desktop.setPopupBounds({
      outerW: Math.round(outerW),
      outerH: Math.round(outerH),
      ...(left !== undefined && top !== undefined ? { left: Math.round(left), top: Math.round(top) } : {}),
    });
    return;
  }

  try {
    window.resizeTo(outerW, outerH);
    if (left !== undefined && top !== undefined) {
      window.moveTo(left, top);
    }
  } catch {
    /* политика браузера */
  }
}

/** Браузер: минимум outer не масштабируется zoom — только полная панель. */
function clampBrowserOuterSize(
  outerW: number,
  outerH: number,
  includePreviewColumn = false,
): { outerW: number; outerH: number } {
  const min = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn });
  const scr = window.screen;
  return {
    outerW: Math.min(Math.max(outerW, min.outerW), scr.availWidth),
    outerH: Math.min(Math.max(outerH, min.outerH), scr.availHeight),
  };
}

/**
 * Обычный браузер: рост оболочки при zoom/превью + откат ручного сжатия ниже min.
 */
function installBrowserWebPopupFrame(): () => void {
  let cancelled = false;
  let isApplyingLock = false;
  let selfResizeUntil = 0;
  let initialApplyTimer = 0;
  let initialAttempts = 0;
  let initialApplyDone = false;
  let applyTimer = 0;
  let dockWatchTimer = 0;
  let previewMutationObserver: MutationObserver | null = null;
  let viewportBaselineReady = false;
  let guardInterval = 0;
  let isSelfResize = false;

  let contentOuterAt100: ContentOuter = { w: 0, h: 0 };
  let zoomFactor = 1;
  let lastObserved: ViewportSnapshot = { outerW: 0, innerW: 0 };

  const lockRef = { current: normalizeLock(readOperatorChatPopupFrameLock()) };
  writeOperatorChatPopupFrameLock(lockRef.current);
  contentOuterAt100 = { w: lockRef.current.outerW, h: lockRef.current.outerH };

  const syncViewportSnapshot = () => {
    lastObserved = { outerW: window.outerWidth, innerW: window.innerWidth };
  };

  const applyOuterSize = (
    outerW: number,
    outerH: number,
    positionOverride?: { left: number; top: number },
  ): boolean => {
    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    const includePreview = dock ? hasPreviewInDock(dock) : false;
    const next = clampBrowserOuterSize(outerW, outerH, includePreview);
    const position =
      positionOverride ?? resolvePopupScreenPosition(next.outerW, next.outerH, lockRef.current);
    const sizeUnchanged =
      Math.abs(window.outerWidth - next.outerW) <= LOCK_TOLERANCE_PX &&
      Math.abs(window.outerHeight - next.outerH) <= LOCK_TOLERANCE_PX;
    const positionUnchanged =
      Math.abs(window.screenX - position.left) <= LOCK_TOLERANCE_PX &&
      Math.abs(window.screenY - position.top) <= LOCK_TOLERANCE_PX;
    if (sizeUnchanged && positionUnchanged) {
      syncViewportSnapshot();
      return false;
    }

    isApplyingLock = true;
    selfResizeUntil = Date.now() + SELF_RESIZE_COOLDOWN_MS;
    isSelfResize = true;
    resizePopupOuter(next.outerW, next.outerH, position.left, position.top);
    lockRef.current = {
      ...lockRef.current,
      outerW: next.outerW,
      outerH: next.outerH,
      left: position.left,
      top: position.top,
    };
    writeOperatorChatPopupFrameLock(lockRef.current);
    window.setTimeout(() => {
      isApplyingLock = false;
      isSelfResize = false;
      syncViewportSnapshot();
    }, SELF_RESIZE_COOLDOWN_MS);
    return true;
  };

  const resolveLockedMinOuterSize = (): { outerW: number; outerH: number } => {
    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    const includePreview = dock ? hasPreviewInDock(dock) : false;
    const minOuter = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn: includePreview });
    return {
      outerW: Math.max(minOuter.outerW, lockRef.current.outerW),
      outerH: Math.max(minOuter.outerH, lockRef.current.outerH),
    };
  };

  const isManuallyTooSmall = (): boolean => {
    const locked = resolveLockedMinOuterSize();
    return (
      window.outerWidth + LOCK_TOLERANCE_PX < locked.outerW ||
      window.outerHeight + LOCK_TOLERANCE_PX < locked.outerH
    );
  };

  const restoreLockFrame = (): boolean => {
    if (isSelfResize || isApplyingLock) return false;
    if (!isManuallyTooSmall()) return false;

    const locked = resolveLockedMinOuterSize();
    const { left, top } = lockRef.current;
    try {
      isSelfResize = true;
      window.resizeTo(locked.outerW, locked.outerH);
      window.moveTo(left, top);
    } catch {
      /* политика браузера */
    }
    window.setTimeout(() => {
      isSelfResize = false;
    }, 0);
    return true;
  };

  const scheduleRestoreRetries = () => {
    [0, 16, 50, 120, 250, 500].forEach((ms) => {
      window.setTimeout(() => {
        if (!cancelled) restoreLockFrame();
      }, ms);
    });
  };

  const enforceMinOuterFrame = (): boolean => {
    if (restoreLockFrame()) {
      scheduleRestoreRetries();
      return true;
    }
    return false;
  };

  const refreshContentOuterAt100 = (dock: Element) => {
    contentOuterAt100 = resolveContentOuterAt100(dock, zoomFactor);
  };

  const applyScaledTarget = () => {
    if (cancelled || isApplyingLock || Date.now() < selfResizeUntil) return;

    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    if (!dock) return;

    const includePreview = hasPreviewInDock(dock);
    const minOuter = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn: includePreview });
    const content = contentOuterAt100;
    let targetW = Math.max(Math.round(content.w * zoomFactor), minOuter.outerW);
    let targetH = Math.max(Math.round(content.h * zoomFactor), minOuter.outerH);

    const overflow = computeDockOverflowPx();
    if (overflow.growW > LOCK_TOLERANCE_PX) {
      targetW = Math.max(targetW, window.outerWidth + overflow.growW);
    }
    if (overflow.growH > LOCK_TOLERANCE_PX) {
      targetH = Math.max(targetH, window.outerHeight + overflow.growH);
    }

    const measured = measureOperatorChatPopupDockOuterSize(dock);
    if (measured.leftOverflowPx > LOCK_TOLERANCE_PX) {
      targetW = Math.max(targetW, window.outerWidth + measured.leftOverflowPx);
    }

    const target = clampBrowserOuterSize(targetW, targetH, includePreview);
    if (target.outerW < minOuter.outerW || target.outerW > 2400) return;

    let position = resolvePopupScreenPosition(target.outerW, target.outerH, lockRef.current);
    if (measured.leftOverflowPx > LOCK_TOLERANCE_PX) {
      position = {
        ...position,
        left: position.left - measured.leftOverflowPx,
      };
    }

    lockRef.current = { ...lockRef.current, outerW: target.outerW, outerH: target.outerH };
    writeOperatorChatPopupFrameLock(lockRef.current);
    applyOuterSize(target.outerW, target.outerH, position);
  };

  const scheduleApply = () => {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(() => {
      if (!cancelled) applyScaledTarget();
    }, APPLY_DEBOUNCE_MS);
  };

  const applyLock = () => {
    if (cancelled || isApplyingLock) return;
    applyOuterSize(lockRef.current.outerW, lockRef.current.outerH);
  };

  const ensurePreviewCountObserver = () => {
    if (previewMutationObserver) return;
    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    if (!dock || typeof MutationObserver === 'undefined') return;

    previewMutationObserver = new MutationObserver(() => {
      refreshContentOuterAt100(dock);
      window.clearTimeout(applyTimer);
      applyTimer = window.setTimeout(() => {
        if (!cancelled) applyScaledTarget();
      }, 60);
    });
    previewMutationObserver.observe(dock, {
      attributes: true,
      attributeFilter: ['data-operator-chat-preview-count'],
      childList: true,
      subtree: true,
    });
  };

  const onWindowResize = () => {
    if (cancelled) return;

    if (enforceMinOuterFrame()) {
      return;
    }

    if (isApplyingLock || Date.now() < selfResizeUntil) return;

    if (!viewportBaselineReady) {
      syncViewportSnapshot();
      return;
    }

    const outerSame =
      Math.abs(window.outerWidth - lastObserved.outerW) <= OUTER_SAME_TOLERANCE_PX;

    if (outerSame && lastObserved.innerW > 0 && window.innerWidth > 0) {
      const innerRatio = lastObserved.innerW / window.innerWidth;
      if (Math.abs(innerRatio - 1) >= ZOOM_INNER_RATIO_THRESHOLD) {
        zoomFactor = Math.min(ZOOM_FACTOR_MAX, Math.max(0.2, zoomFactor * innerRatio));

        const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
        if (dock) {
          refreshContentOuterAt100(dock);
        }

        scheduleApply();
      }
    }

    const overflow = computeDockOverflowPx();
    if (overflow.growW > LOCK_TOLERANCE_PX || overflow.growH > LOCK_TOLERANCE_PX) {
      scheduleApply();
    }

    syncViewportSnapshot();
  };

  const runInitialApply = () => {
    if (cancelled || initialApplyDone) return;
    applyLock();
    if (isWidthSatisfied(lockRef.current)) {
      initialApplyDone = true;
      viewportBaselineReady = true;
      syncViewportSnapshot();
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (dock) refreshContentOuterAt100(dock);
      scheduleApply();
      return;
    }
    if (initialAttempts++ >= INITIAL_APPLY_MAX_ATTEMPTS) {
      initialApplyDone = true;
      viewportBaselineReady = true;
      syncViewportSnapshot();
      scheduleApply();
      return;
    }
    initialApplyTimer = window.setTimeout(runInitialApply, INITIAL_APPLY_INTERVAL_MS);
  };

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) window.setTimeout(onWindowResize, 50);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.key === '+' || event.key === '-' || event.key === '=' || event.key === '0') {
      if (event.key === '0') {
        zoomFactor = 1;
        const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
        if (dock) refreshContentOuterAt100(dock);
      }
      window.setTimeout(onWindowResize, 50);
    }
  };

  const onMouseUp = () => {
    if (restoreLockFrame()) scheduleRestoreRetries();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      enforceMinOuterFrame();
      runInitialApply();
      ensurePreviewCountObserver();
    });
  });

  const vv = window.visualViewport;
  vv?.addEventListener('resize', onWindowResize);
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mouseup', onMouseUp);

  guardInterval = window.setInterval(() => {
    if (cancelled) return;
    if (isManuallyTooSmall()) restoreLockFrame();
  }, 80);

  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  dockWatchTimer = window.setInterval(() => {
    if (cancelled) return;
    ensurePreviewCountObserver();
    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    if (dock) {
      refreshContentOuterAt100(dock);
      scheduleApply();
      window.clearInterval(dockWatchTimer);
      dockWatchTimer = 0;
    }
  }, 400);

  return () => {
    cancelled = true;
    window.clearTimeout(initialApplyTimer);
    window.clearTimeout(applyTimer);
    if (dockWatchTimer) window.clearInterval(dockWatchTimer);
    if (guardInterval) window.clearInterval(guardInterval);
    vv?.removeEventListener('resize', onWindowResize);
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    previewMutationObserver?.disconnect();
  };
}

/**
 * Popup (PWA): outer = contentAt100% × zoomFactor; overflow только расширяет target, baseline не раздувается.
 */
function installPwaDynamicPopupFrame(): () => void {
  let cancelled = false;
  let isApplyingLock = false;
  let selfResizeUntil = 0;
  let initialApplyTimer = 0;
  let initialAttempts = 0;
  let initialApplyDone = false;
  let applyTimer = 0;
  let dockWatchTimer = 0;
  let previewMutationObserver: MutationObserver | null = null;
  let viewportBaselineReady = false;

  let contentOuterAt100: ContentOuter = { w: 0, h: 0 };
  let zoomFactor = 1;
  let lastObserved: ViewportSnapshot = { outerW: 0, innerW: 0 };

  const lockRef = { current: normalizeLock(readOperatorChatPopupFrameLock()) };
  writeOperatorChatPopupFrameLock(lockRef.current);
  contentOuterAt100 = { w: lockRef.current.outerW, h: lockRef.current.outerH };

  const syncViewportSnapshot = () => {
    lastObserved = { outerW: window.outerWidth, innerW: window.innerWidth };
  };

  const applyOuterSize = (
    outerW: number,
    outerH: number,
    positionOverride?: { left: number; top: number },
  ): boolean => {
    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    const next = clampOuterSize(
      outerW,
      outerH,
      zoomFactor,
      dock ? hasPreviewInDock(dock) : false,
    );
    const position =
      positionOverride ?? resolvePopupScreenPosition(next.outerW, next.outerH, lockRef.current);
    const sizeUnchanged =
      Math.abs(window.outerWidth - next.outerW) <= LOCK_TOLERANCE_PX &&
      Math.abs(window.outerHeight - next.outerH) <= LOCK_TOLERANCE_PX;
    const positionUnchanged =
      Math.abs(window.screenX - position.left) <= LOCK_TOLERANCE_PX &&
      Math.abs(window.screenY - position.top) <= LOCK_TOLERANCE_PX;
    if (sizeUnchanged && positionUnchanged) {
      syncViewportSnapshot();
      return false;
    }

    isApplyingLock = true;
    selfResizeUntil = Date.now() + SELF_RESIZE_COOLDOWN_MS;
    resizePopupOuter(next.outerW, next.outerH, position.left, position.top);
    lockRef.current = {
      ...lockRef.current,
      outerW: next.outerW,
      outerH: next.outerH,
      left: position.left,
      top: position.top,
    };
    writeOperatorChatPopupFrameLock(lockRef.current);
    window.setTimeout(() => {
      isApplyingLock = false;
      syncViewportSnapshot();
    }, SELF_RESIZE_COOLDOWN_MS);
    return true;
  };

  const resolveLockedMinOuterSize = (): { outerW: number; outerH: number } => {
    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    const includePreview = dock ? hasPreviewInDock(dock) : false;
    const minOuter = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn: includePreview });
    return {
      outerW: Math.max(minOuter.outerW, lockRef.current.outerW),
      outerH: Math.max(minOuter.outerH, lockRef.current.outerH),
    };
  };

  /** Ручной ресайз краёв окна (Chrome игнорирует resizable=no) — возвращаем lock/min. */
  const enforceMinOuterFrame = (): boolean => {
    if (isApplyingLock) return false;
    const locked = resolveLockedMinOuterSize();
    const tooSmallW = window.outerWidth + LOCK_TOLERANCE_PX < locked.outerW;
    const tooSmallH = window.outerHeight + LOCK_TOLERANCE_PX < locked.outerH;
    if (!tooSmallW && !tooSmallH) return false;

    const applied = applyOuterSize(locked.outerW, locked.outerH);
    if (applied) {
      contentOuterAt100 = {
        w: Math.max(contentOuterAt100.w, lockRef.current.outerW),
        h: Math.max(contentOuterAt100.h, lockRef.current.outerH),
      };
    }
    return applied;
  };

  const refreshContentOuterAt100 = (dock: Element) => {
    contentOuterAt100 = resolveContentOuterAt100(dock, zoomFactor);
  };

  const applyScaledTarget = () => {
    if (cancelled || isApplyingLock || Date.now() < selfResizeUntil) return;

    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    if (!dock) return;

    const includePreview = hasPreviewInDock(dock);
    const minOuter = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn: includePreview });
    const content = contentOuterAt100;
    let targetW = Math.max(Math.round(content.w * zoomFactor), minOuter.outerW);
    let targetH = Math.max(Math.round(content.h * zoomFactor), minOuter.outerH);

    const overflow = computeDockOverflowPx();
    if (overflow.growW > LOCK_TOLERANCE_PX) {
      targetW = Math.max(targetW, window.outerWidth + overflow.growW);
    }
    if (overflow.growH > LOCK_TOLERANCE_PX) {
      targetH = Math.max(targetH, window.outerHeight + overflow.growH);
    }

    const measured = measureOperatorChatPopupDockOuterSize(dock);
    if (measured.leftOverflowPx > LOCK_TOLERANCE_PX) {
      targetW = Math.max(targetW, window.outerWidth + measured.leftOverflowPx);
    }

    const target = clampOuterSize(targetW, targetH, zoomFactor, includePreview);
    if (target.outerW < ABS_MIN_OUTER_W_PX || target.outerW > 2400) return;

    let position = resolvePopupScreenPosition(target.outerW, target.outerH, lockRef.current);
    const electronAutoReposition = isElectronChatShell() && !readChatLayoutPinned(true);
    if (measured.leftOverflowPx > LOCK_TOLERANCE_PX && !electronAutoReposition) {
      position = {
        ...position,
        left: position.left - measured.leftOverflowPx,
      };
    }

    lockRef.current = { ...lockRef.current, outerW: target.outerW, outerH: target.outerH };
    writeOperatorChatPopupFrameLock(lockRef.current);
    applyOuterSize(target.outerW, target.outerH, position);
  };

  const scheduleApply = () => {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(() => {
      if (!cancelled) applyScaledTarget();
    }, APPLY_DEBOUNCE_MS);
  };

  const applyLock = () => {
    if (cancelled || isApplyingLock) return;
    applyOuterSize(lockRef.current.outerW, lockRef.current.outerH);
  };

  const ensurePreviewCountObserver = () => {
    if (previewMutationObserver) return;
    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    if (!dock || typeof MutationObserver === 'undefined') return;

    previewMutationObserver = new MutationObserver(() => {
      refreshContentOuterAt100(dock);
      window.clearTimeout(applyTimer);
      applyTimer = window.setTimeout(() => {
        if (!cancelled) applyScaledTarget();
      }, 60);
    });
    previewMutationObserver.observe(dock, {
      attributes: true,
      attributeFilter: ['data-operator-chat-preview-count'],
      childList: true,
      subtree: true,
    });
  };

  const onWindowResize = () => {
    if (cancelled) return;

    if (enforceMinOuterFrame()) {
      return;
    }

    if (isApplyingLock || Date.now() < selfResizeUntil) return;

    if (!viewportBaselineReady) {
      syncViewportSnapshot();
      return;
    }

    const outerSame =
      Math.abs(window.outerWidth - lastObserved.outerW) <= OUTER_SAME_TOLERANCE_PX;

    if (outerSame && lastObserved.innerW > 0 && window.innerWidth > 0) {
      const innerRatio = lastObserved.innerW / window.innerWidth;
      if (Math.abs(innerRatio - 1) >= ZOOM_INNER_RATIO_THRESHOLD) {
        zoomFactor = Math.min(ZOOM_FACTOR_MAX, Math.max(0.2, zoomFactor * innerRatio));

        const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
        if (dock) {
          refreshContentOuterAt100(dock);
        }

        scheduleApply();
      }
    }

    syncViewportSnapshot();
  };

  const runInitialApply = () => {
    if (cancelled || initialApplyDone) return;
    applyLock();
    if (isWidthSatisfied(lockRef.current)) {
      initialApplyDone = true;
      viewportBaselineReady = true;
      syncViewportSnapshot();
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (dock) refreshContentOuterAt100(dock);
      scheduleApply();
      return;
    }
    if (initialAttempts++ >= INITIAL_APPLY_MAX_ATTEMPTS) {
      initialApplyDone = true;
      viewportBaselineReady = true;
      syncViewportSnapshot();
      scheduleApply();
      return;
    }
    initialApplyTimer = window.setTimeout(runInitialApply, INITIAL_APPLY_INTERVAL_MS);
  };

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) window.setTimeout(onWindowResize, 50);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.key === '+' || event.key === '-' || event.key === '=' || event.key === '0') {
      if (event.key === '0') {
        zoomFactor = 1;
        const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
        if (dock) refreshContentOuterAt100(dock);
      }
      window.setTimeout(onWindowResize, 50);
    }
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      enforceMinOuterFrame();
      runInitialApply();
      ensurePreviewCountObserver();
    });
  });

  const vv = window.visualViewport;
  const unsubscribeDesktopZoom =
    isElectronChatShell() && window.alcolockDesktop?.onZoomChanged
      ? window.alcolockDesktop.onZoomChanged(() => {
          window.setTimeout(onWindowResize, 50);
        })
      : undefined;

  vv?.addEventListener('resize', onWindowResize);
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mouseup', enforceMinOuterFrame);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  dockWatchTimer = window.setInterval(() => {
    if (cancelled) return;
    ensurePreviewCountObserver();
    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    if (dock) {
      refreshContentOuterAt100(dock);
      scheduleApply();
      window.clearInterval(dockWatchTimer);
      dockWatchTimer = 0;
    }
  }, 400);
  window.setTimeout(() => {
    if (dockWatchTimer) {
      window.clearInterval(dockWatchTimer);
      dockWatchTimer = 0;
    }
  }, 12000);

  return () => {
    cancelled = true;
    window.clearTimeout(initialApplyTimer);
    window.clearTimeout(applyTimer);
    if (dockWatchTimer) window.clearInterval(dockWatchTimer);
    vv?.removeEventListener('resize', onWindowResize);
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('mouseup', enforceMinOuterFrame);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    previewMutationObserver?.disconnect();
    unsubscribeDesktopZoom?.();
  };
}

export function useOperatorChatPopupWindowFrame(): void {
  useEffect(() => {
    if (isElectronChatShell() || isPwaDisplayMode()) {
      return installPwaDynamicPopupFrame();
    }
    return installBrowserWebPopupFrame();
  }, []);
}
