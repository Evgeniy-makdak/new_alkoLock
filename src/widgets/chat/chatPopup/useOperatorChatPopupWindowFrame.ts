import { useEffect } from 'react';

import { OPERATOR_CHAT_POPUP_DOCK_SELECTOR } from './constants';

const MIN_INNER_W = 360;
const MIN_INNER_H = 320;
const PAD_PX = 10;
const MAX_RAF_ATTEMPTS = 180;

function outerChromeDelta(): { dx: number; dy: number } {
  const dx = window.outerWidth - window.innerWidth;
  const dy = window.outerHeight - window.innerHeight;
  return {
    dx: Number.isFinite(dx) ? dx : 0,
    dy: Number.isFinite(dy) ? dy : 0,
  };
}

/**
 * Подгоняет внешние размеры окна под блок dock чата (без лишнего пустого viewport).
 * Срабатывает после появления разметки и при изменении dock (превью, ресайз панели).
 */
export function useOperatorChatPopupWindowFrame(): void {
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let attempts = 0;

    const apply = () => {
      if (cancelled) return;
      const dock = document.querySelector(OPERATOR_CHAT_POPUP_DOCK_SELECTOR);
      if (!dock) return;

      const r = dock.getBoundingClientRect();
      const innerW = Math.ceil(r.right + PAD_PX);
      const innerH = Math.ceil(r.bottom + PAD_PX);
      const maxW = window.screen.availWidth;
      const maxH = window.screen.availHeight;
      const innerWClamped = Math.max(MIN_INNER_W, Math.min(maxW, innerW));
      const innerHClamped = Math.max(MIN_INNER_H, Math.min(maxH, innerH));
      const { dx, dy } = outerChromeDelta();
      try {
        window.resizeTo(innerWClamped + dx, innerHClamped + dy);
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
