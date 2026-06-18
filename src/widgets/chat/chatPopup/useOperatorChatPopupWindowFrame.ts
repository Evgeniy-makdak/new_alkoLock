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
const DOCK_FIT_CHECK_DELAY_MS = 600;
const DOCK_FIT_CHECK_INTERVAL_MS = 400;
/** Дебаунс для fitDockToContent: предотвращает бесконечный цикл resize → observer → resize */
const FIT_DOCK_DEBOUNCE_MS = 300;
/** Минимальная дельта для вызова resizeTo - если меньше, игнорируем (защита от микро-колебаний) */
const MIN_RESIZE_DELTA_PX = 16;

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
 */
export function useOperatorChatPopupWindowFrame(): void {
  useEffect(() => {
    if (window.alcolockDesktop) return;

    let cancelled = false;
    let isApplyingLock = false;
    let restoreTimer = 0;
    let initialApplyTimer = 0;
    let fitDockTimer = 0;
    let fitDockRaf = 0;
    let positionPersistTimer = 0;
    let initialAttempts = 0;
    let initialApplyDone = false;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    /** Дебаунс-таймер для fitDockToContent */
    let fitDockDebounceTimer = 0;
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

    /** Подгоняем browser popup под реальный dock: компактно без превью, шире при появлении превью. */
    const fitDockToContent = () => {
      if (cancelled || !initialApplyDone) return;
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (!dock) return;

      const measured = measureOperatorChatPopupDockOuterSize(dock);
      
      // Защита от бесконечного цикла: проверяем, что размер изменился значительно
      const deltaW = Math.abs(measured.outerW - lastAppliedOuterW);
      const deltaH = Math.abs(measured.outerH - lastAppliedOuterH);
      
      // Игнорируем микро-колебания (< MIN_RESIZE_DELTA_PX)
      if (deltaW < MIN_RESIZE_DELTA_PX && deltaH < MIN_RESIZE_DELTA_PX) {
        return;
      }
      
      const next = {
        ...lockRef.current,
        outerW: measured.outerW,
        outerH: measured.outerH,
      };
      
      // Проверяем, что изменение значимое относительно текущего lock
      const lockDeltaW = Math.abs(next.outerW - lockRef.current.outerW);
      const lockDeltaH = Math.abs(next.outerH - lockRef.current.outerH);
      
      if (lockDeltaW <= LOCK_TOLERANCE_PX && lockDeltaH <= LOCK_TOLERANCE_PX) {
        return;
      }
      
      lockRef.current = next;
      writeOperatorChatPopupFrameLock(lockRef.current);
      lastAppliedOuterW = measured.outerW;
      lastAppliedOuterH = measured.outerH;
      applyLock();
    };

    /** Обёртка с дебаунсом для fitDockToContent */
    const scheduleFitDockToContent = () => {
      if (cancelled || !initialApplyDone) return;
      window.clearTimeout(fitDockDebounceTimer);
      window.cancelAnimationFrame(fitDockRaf);
      fitDockDebounceTimer = window.setTimeout(() => {
        fitDockRaf = window.requestAnimationFrame(fitDockToContent);
      }, FIT_DOCK_DEBOUNCE_MS);
    };

    const installContentObservers = () => {
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (!dock) return;

      if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(scheduleFitDockToContent);
        resizeObserver.observe(dock);
      }
      if (!mutationObserver && document.body) {
        mutationObserver = new MutationObserver(scheduleFitDockToContent);
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'data-operator-chat-preview'],
        });
      }
    };

    const runInitialApply = () => {
      if (cancelled || initialApplyDone) return;
      applyLock();
      if (isWidthSatisfied(lockRef.current)) {
        initialApplyDone = true;
        installContentObservers();
        window.setTimeout(fitDockToContent, DOCK_FIT_CHECK_DELAY_MS);
        return;
      }
      if (initialAttempts++ >= INITIAL_APPLY_MAX_ATTEMPTS) {
        initialApplyDone = true;
        installContentObservers();
        window.setTimeout(fitDockToContent, DOCK_FIT_CHECK_DELAY_MS);
        return;
      }
      initialApplyTimer = window.setTimeout(runInitialApply, INITIAL_APPLY_INTERVAL_MS);
    };

    const scheduleRestoreFromOs = () => {
      if (cancelled || isApplyingLock || !initialApplyDone) return;
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(fitDockToContent, 150);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(runInitialApply);
    });

    positionPersistTimer = window.setInterval(persistCurrentPosition, 500);
    fitDockTimer = window.setInterval(fitDockToContent, DOCK_FIT_CHECK_INTERVAL_MS);
    window.addEventListener('resize', scheduleRestoreFromOs);

    return () => {
      cancelled = true;
      window.clearTimeout(restoreTimer);
      window.clearTimeout(initialApplyTimer);
      window.clearTimeout(fitDockDebounceTimer);
      window.cancelAnimationFrame(fitDockRaf);
      window.clearInterval(fitDockTimer);
      window.clearInterval(positionPersistTimer);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', scheduleRestoreFromOs);
    };
  }, []);
}
