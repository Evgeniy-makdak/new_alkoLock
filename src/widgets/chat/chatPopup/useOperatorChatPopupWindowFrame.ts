import { useEffect } from 'react';

import { isPwaDisplayMode } from './chatShellEnvironment';
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
} from './operatorChatPopupLayout';

const LOCK_TOLERANCE_PX = 8;
const OUTER_SAME_TOLERANCE_PX = 6;
const ZOOM_INNER_RATIO_THRESHOLD = 0.006;
const ZOOM_FACTOR_MAX = 3;
const ZOOM_NEAR_ONE = 0.07;
const ABS_MIN_OUTER_PX = 300;
const INITIAL_APPLY_MAX_ATTEMPTS = 12;
const INITIAL_APPLY_INTERVAL_MS = 120;
const APPLY_DEBOUNCE_MS = 400;
const SELF_RESIZE_COOLDOWN_MS = 550;
const BROWSER_FIXED_FRAME_APPLY_MS = 120;

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

/** Минимум outer масштабируется с zoom — иначе оболочка «застревает» при 67% и ниже. */
function clampOuterSize(
  outerW: number,
  outerH: number,
  zoomFactor = 1,
): { outerW: number; outerH: number } {
  const min = getOperatorChatPopupMinOuterSize(undefined, { includePreviewColumn: false });
  const safeZoom = Math.max(zoomFactor, 0.2);
  const scaledMinW = Math.max(ABS_MIN_OUTER_PX, Math.round(min.outerW * safeZoom));
  const scaledMinH = Math.max(ABS_MIN_OUTER_PX, Math.round(min.outerH * safeZoom));
  const scr = window.screen;
  return {
    outerW: Math.min(Math.max(outerW, scaledMinW), scr.availWidth),
    outerH: Math.min(Math.max(outerH, scaledMinH), scr.availHeight),
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

  if (Math.abs(zoomFactor - 1) <= ZOOM_NEAR_ONE) {
    const measured = measureOperatorChatPopupDockOuterSize(dock);
    return {
      w: Math.max(measured.outerW, minSize.outerW),
      h: Math.max(measured.outerH, minSize.outerH),
    };
  }

  return { w: minSize.outerW, h: minSize.outerH };
}

/** Браузер (не PWA): фиксированная геометрия popup без ручного/ОС ресайза. */
function installBrowserFixedPopupFrame(): () => void {
  const lockRef = { current: normalizeLock(readOperatorChatPopupFrameLock()) };
  writeOperatorChatPopupFrameLock(lockRef.current);

  let isApplying = false;
  let applyTimer = 0;

  const applyLock = () => {
    if (isApplying) return;
    const { outerW, outerH, left, top } = lockRef.current;
    const needsResize =
      Math.abs(window.outerWidth - outerW) > LOCK_TOLERANCE_PX ||
      Math.abs(window.outerHeight - outerH) > LOCK_TOLERANCE_PX;
    const needsMove =
      Math.abs(window.screenX - left) > LOCK_TOLERANCE_PX ||
      Math.abs(window.screenY - top) > LOCK_TOLERANCE_PX;
    if (!needsResize && !needsMove) return;

    isApplying = true;
    try {
      if (needsResize) {
        window.resizeTo(outerW, outerH);
      }
      if (needsMove) {
        window.moveTo(left, top);
      }
    } catch {
      /* политика браузера */
    }
    window.setTimeout(() => {
      isApplying = false;
    }, BROWSER_FIXED_FRAME_APPLY_MS);
  };

  const scheduleApply = () => {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(applyLock, 40);
  };

  const onResize = () => {
    scheduleApply();
  };

  applyLock();
  requestAnimationFrame(applyLock);
  window.addEventListener('resize', onResize);

  return () => {
    window.clearTimeout(applyTimer);
    window.removeEventListener('resize', onResize);
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

  const applyOuterSize = (outerW: number, outerH: number): boolean => {
    const next = clampOuterSize(outerW, outerH, zoomFactor);
    if (
      Math.abs(window.outerWidth - next.outerW) <= LOCK_TOLERANCE_PX &&
      Math.abs(window.outerHeight - next.outerH) <= LOCK_TOLERANCE_PX
    ) {
      syncViewportSnapshot();
      return false;
    }

    isApplyingLock = true;
    selfResizeUntil = Date.now() + SELF_RESIZE_COOLDOWN_MS;
    try {
      window.resizeTo(next.outerW, next.outerH);
    } catch {
      /* политика браузера */
    }
    window.setTimeout(() => {
      isApplyingLock = false;
      syncViewportSnapshot();
    }, SELF_RESIZE_COOLDOWN_MS);
    return true;
  };

  const refreshContentOuterAt100 = (dock: Element) => {
    contentOuterAt100 = resolveContentOuterAt100(dock, zoomFactor);
  };

  const applyScaledTarget = () => {
    if (cancelled || isApplyingLock || Date.now() < selfResizeUntil) return;

    const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
    if (!dock) return;

    const content = contentOuterAt100;
    let targetW = Math.round(content.w * zoomFactor);
    let targetH = Math.round(content.h * zoomFactor);

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

    const target = clampOuterSize(targetW, targetH, zoomFactor);
    if (target.outerW < ABS_MIN_OUTER_PX || target.outerW > 2400) return;

    lockRef.current = { ...lockRef.current, outerW: target.outerW, outerH: target.outerH };
    writeOperatorChatPopupFrameLock(lockRef.current);
    applyOuterSize(target.outerW, target.outerH);
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
      scheduleApply();
    });
    previewMutationObserver.observe(dock, {
      attributes: true,
      attributeFilter: ['data-operator-chat-preview-count'],
    });
  };

  const onWindowResize = () => {
    if (cancelled || isApplyingLock || Date.now() < selfResizeUntil) return;

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
        if (dock && Math.abs(zoomFactor - 1) <= ZOOM_NEAR_ONE) {
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
      runInitialApply();
      ensurePreviewCountObserver();
    });
  });

  const vv = window.visualViewport;
  vv?.addEventListener('resize', onWindowResize);
  window.addEventListener('resize', onWindowResize);
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
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    previewMutationObserver?.disconnect();
  };
}

export function useOperatorChatPopupWindowFrame(): void {
  useEffect(() => {
    if (window.alcolockDesktop) return;
    if (!isPwaDisplayMode()) {
      return installBrowserFixedPopupFrame();
    }
    return installPwaDynamicPopupFrame();
  }, []);
}
