import { useEffect } from 'react';

import { OPERATOR_CHAT_POPUP_DOCK_SELECTOR } from './constants';

const PAD_PX = 10;
const MAX_RAF_ATTEMPTS = 180;
/** В течение этого времени после монтирования не уменьшаем окно — даём React отрендерить полный dock. */
const INITIAL_RENDER_DELAY_MS = 800;

function outerChromeDelta(): { dx: number; dy: number } {
  const dx = window.outerWidth - window.innerWidth;
  const dy = window.outerHeight - window.innerHeight;
  return {
    dx: Number.isFinite(dx) ? dx : 0,
    dy: Number.isFinite(dy) ? dy : 0,
  };
}

/**
 * Подгоняет внешние размеры окна под блок dock чата.
 * При инициализации сохраняет стартовый размер окна (из window.open) и не даёт
 * уменьшить его, пока React не отрендерит полный контент dock.
 */
export function useOperatorChatPopupWindowFrame(): void {
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let attempts = 0;
    const startTime = Date.now();
    // Запоминаем стартовый размер окна — не даём уменьшить ниже этого.
    const minOuterW = window.outerWidth;
    const minOuterH = window.outerHeight;

    const apply = () => {
      if (cancelled) return;
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (!dock) return;

      const r = dock.getBoundingClientRect();
      const innerW = Math.ceil(r.right + PAD_PX);
      const innerH = Math.ceil(r.bottom + PAD_PX);
      const maxW = window.screen.availWidth;
      const maxH = window.screen.availHeight;
      const { dx, dy } = outerChromeDelta();

      let targetOuterW = innerW + dx;
      let targetOuterH = innerH + dy;

      // В течение INITIAL_RENDER_DELAY_MS не уменьшаем окно ниже стартового размера.
      if (Date.now() - startTime < INITIAL_RENDER_DELAY_MS) {
        targetOuterW = Math.max(targetOuterW, minOuterW);
        targetOuterH = Math.max(targetOuterH, minOuterH);
      }

      targetOuterW = Math.min(maxW, targetOuterW);
      targetOuterH = Math.min(maxH, targetOuterH);

      try {
        window.resizeTo(targetOuterW, targetOuterH);
      } catch {
        /* ignore — политика браузера */
      }
    };

    const tryBind = () => {
      if (cancelled) return;
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (dock) {
        apply();
        ro = new ResizeObserver(() => apply());
        ro.observe(dock);
        window.addEventListener('resize', apply);
        return;
      }
      if (attempts++ >= MAX_RAF_ATTEMPTS) return;
      requestAnimationFrame(tryBind);
    };

    requestAnimationFrame(tryBind);

    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);
}
