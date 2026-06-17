import { useEffect } from 'react';

import { OPERATOR_CHAT_POPUP_DOCK_SELECTOR } from './constants';
import {
  type OperatorChatPopupFrameLock,
  readOperatorChatPopupFrameLock,
  writeOperatorChatPopupFrameLock,
} from './operatorChatPopupFrameLock';
import { getOperatorChatPopupMinOuterSize } from './operatorChatPopupLayout';
import { readChatLayoutPinned } from './popupLayoutStorage';

const LOCK_TOLERANCE_PX = 8;
const INITIAL_APPLY_MAX_ATTEMPTS = 12;
const INITIAL_APPLY_INTERVAL_MS = 120;
const DOCK_FIT_CHECK_DELAY_MS = 600;

function captureFrameLock(): OperatorChatPopupFrameLock {
  return {
    outerW: window.outerWidth,
    outerH: window.outerHeight,
    left: window.screenX,
    top: window.screenY,
  };
}

function normalizeLock(raw: OperatorChatPopupFrameLock | null): OperatorChatPopupFrameLock {
  const min = getOperatorChatPopupMinOuterSize();
  const base = raw ?? captureFrameLock();
  return {
    outerW: Math.max(base.outerW, min.outerW),
    outerH: Math.max(base.outerH, min.outerH),
    left: base.left,
    top: base.top,
  };
}

function isLockSatisfied(lock: OperatorChatPopupFrameLock): boolean {
  return (
    window.outerWidth + LOCK_TOLERANCE_PX >= lock.outerW &&
    window.outerHeight + LOCK_TOLERANCE_PX >= lock.outerH
  );
}

function isWidthSatisfied(lock: OperatorChatPopupFrameLock): boolean {
  return window.outerWidth + LOCK_TOLERANCE_PX >= lock.outerW;
}

/**
 * Popup: размер из frame lock (window.open). Firefox часто игнорирует width в features —
 * несколько resizeTo без polling/ResizeObserver (без «дёрганья»).
 */
export function useOperatorChatPopupWindowFrame(): void {
  useEffect(() => {
    let cancelled = false;
    let isApplyingLock = false;
    let restoreTimer = 0;
    let initialApplyTimer = 0;
    let positionPersistTimer = 0;
    let initialAttempts = 0;
    let initialApplyDone = false;
    let fitDockOnceDone = false;

    const lockRef = { current: normalizeLock(readOperatorChatPopupFrameLock()) };
    writeOperatorChatPopupFrameLock(lockRef.current);

    const applyLock = () => {
      if (cancelled || isApplyingLock) return;
      const lock = lockRef.current;
      if (isLockSatisfied(lock)) return;

      isApplyingLock = true;
      try {
        window.resizeTo(lock.outerW, lock.outerH);
      } catch {
        /* политика браузера */
      }
      window.setTimeout(() => {
        isApplyingLock = false;
      }, 50);
    };

    const persistCurrentPosition = () => {
      const left = window.screenX;
      const top = window.screenY;
      const lock = lockRef.current;
      if (
        Math.abs(lock.left - left) <= LOCK_TOLERANCE_PX &&
        Math.abs(lock.top - top) <= LOCK_TOLERANCE_PX
      ) {
        return;
      }
      lockRef.current = { ...lock, left, top };
      writeOperatorChatPopupFrameLock(lockRef.current);
    };

    /** Один раз после появления dock: превью слева обрезано (r.left < 0) — чуть расширить lock. */
    const fitDockOnce = () => {
      if (cancelled || fitDockOnceDone || !initialApplyDone) return;
      if (readChatLayoutPinned(true)) {
        fitDockOnceDone = true;
        return;
      }
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (!dock) return;

      const r = dock.getBoundingClientRect();
      if (r.left >= 8 && r.right <= window.innerWidth - 8) {
        fitDockOnceDone = true;
        return;
      }

      let extra = 0;
      if (r.left < 8) extra += Math.ceil(8 - r.left);
      if (r.right > window.innerWidth - 8) extra += Math.ceil(r.right - (window.innerWidth - 8));
      if (extra <= 0) return;

      lockRef.current.outerW += extra;
      writeOperatorChatPopupFrameLock(lockRef.current);
      applyLock();
      fitDockOnceDone = true;
    };

    const runInitialApply = () => {
      if (cancelled || initialApplyDone) return;
      applyLock();
      if (isWidthSatisfied(lockRef.current)) {
        initialApplyDone = true;
        window.setTimeout(fitDockOnce, DOCK_FIT_CHECK_DELAY_MS);
        return;
      }
      if (initialAttempts++ >= INITIAL_APPLY_MAX_ATTEMPTS) {
        initialApplyDone = true;
        window.setTimeout(fitDockOnce, DOCK_FIT_CHECK_DELAY_MS);
        return;
      }
      initialApplyTimer = window.setTimeout(runInitialApply, INITIAL_APPLY_INTERVAL_MS);
    };

    const scheduleRestoreFromOs = () => {
      if (cancelled || isApplyingLock || !initialApplyDone) return;
      if (readChatLayoutPinned(true)) return;
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(applyLock, 150);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(runInitialApply);
    });

    positionPersistTimer = window.setInterval(persistCurrentPosition, 500);
    window.addEventListener('resize', scheduleRestoreFromOs);

    return () => {
      cancelled = true;
      window.clearTimeout(restoreTimer);
      window.clearTimeout(initialApplyTimer);
      window.clearInterval(positionPersistTimer);
      window.removeEventListener('resize', scheduleRestoreFromOs);
    };
  }, []);
}
