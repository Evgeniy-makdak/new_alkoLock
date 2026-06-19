import { useEffect } from 'react';

import { OPERATOR_CHAT_POPUP_DOCK_SELECTOR } from './constants';
import {
  type OperatorChatPopupFrameLock,
  readOperatorChatPopupFrameLock,
  writeOperatorChatPopupFrameLock,
} from './operatorChatPopupFrameLock';
import {
  getOperatorChatPopupMinOuterSize,
  measureOperatorChatPopupDockOuterSize,
} from './operatorChatPopupLayout';

const LOCK_TOLERANCE_PX = 8;
const INITIAL_APPLY_MAX_ATTEMPTS = 12;
const INITIAL_APPLY_INTERVAL_MS = 120;

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

function isLockSatisfied(lock: OperatorChatPopupFrameLock): boolean {
  return (
    Math.abs(window.outerWidth - lock.outerW) <= LOCK_TOLERANCE_PX &&
    Math.abs(window.outerHeight - lock.outerH) <= LOCK_TOLERANCE_PX
  );
}

function isWidthSatisfied(lock: OperatorChatPopupFrameLock): boolean {
  return window.outerWidth + LOCK_TOLERANCE_PX >= lock.outerW;
}

/**
 * Popup: размер из frame lock (window.open). Firefox часто игнорирует width в features —
 * несколько resizeTo без polling/ResizeObserver (без «дёрганья»).
 * Для web-версии: динамическая подгонка ШИРИНЫ при появлении/исчезновении превью сбоку.
 */
export function useOperatorChatPopupWindowFrame(): void {
  useEffect(() => {
    if (window.alcolockDesktop) return;

    let cancelled = false;
    let isApplyingLock = false;
    let initialApplyTimer = 0;
    let initialAttempts = 0;
    let initialApplyDone = false;
    let resizeObserver: ResizeObserver | null = null;
    /** Последний применённый размер для предотвращения цикла */
    let lastAppliedOuterW = 0;
    let lastAppliedOuterH = 0;

    const lockRef = { current: normalizeLock(readOperatorChatPopupFrameLock()) };
    writeOperatorChatPopupFrameLock(lockRef.current);

    const applyLock = () => {
      if (cancelled || isApplyingLock) return;
      const lock = lockRef.current;
      if (isLockSatisfied(lock)) return;

      isApplyingLock = true;
      try {
        window.resizeTo(lock.outerW, lock.outerH);
        lastAppliedOuterW = lock.outerW;
        lastAppliedOuterH = lock.outerH;
      } catch {
        /* политика браузера */
      }
      window.setTimeout(() => {
        isApplyingLock = false;
      }, 50);
    };

/** Подгоняем ШИРИНУ popup при изменении контента (появление/исчезновение превью) */
    const fitDockWidthToContent = () => {
      if (cancelled) return;
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (!dock) return;

      const measured = measureOperatorChatPopupDockOuterSize(dock);
      
      // Проверяем, что измерение валидное
      if (measured.outerW < 400 || measured.outerW > 2000) {
        return;
      }
      
      // Проверяем, что изменение ширины значимое
      const lockDeltaW = Math.abs(measured.outerW - lockRef.current.outerW);
      
      if (lockDeltaW <= LOCK_TOLERANCE_PX) {
        return;
      }
      
      lockRef.current = {
        ...lockRef.current,
        outerW: measured.outerW,
        outerH: measured.outerH, // Применяем высоту из измерения (без browser chrome)
      };
      writeOperatorChatPopupFrameLock(lockRef.current);
      lastAppliedOuterW = measured.outerW;
      lastAppliedOuterH = measured.outerH;
      applyLock();
    };

    const runInitialApply = () => {
      if (cancelled || initialApplyDone) return;
      applyLock();
      if (isWidthSatisfied(lockRef.current)) {
        initialApplyDone = true;
        return;
      }
      if (initialAttempts++ >= INITIAL_APPLY_MAX_ATTEMPTS) {
        initialApplyDone = true;
        return;
      }
      initialApplyTimer = window.setTimeout(runInitialApply, INITIAL_APPLY_INTERVAL_MS);
    };

    // Устанавливаем ResizeObserver для отслеживания изменения ширины dock
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        runInitialApply();
        
        // Наблюдаем за dock для динамической подгонки ширины
        const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
        if (dock && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            // Дебаунс 300ms для предотвращения дёрганья
            window.setTimeout(fitDockWidthToContent, 300);
          });
          resizeObserver.observe(dock);
        }
      });
    });

    return () => {
      cancelled = true;
      window.clearTimeout(initialApplyTimer);
      resizeObserver?.disconnect();
    };
  }, []);
}
