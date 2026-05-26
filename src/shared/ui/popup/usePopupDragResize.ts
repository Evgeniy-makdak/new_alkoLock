import { useCallback, useEffect, useRef, useState } from 'react';

export type PopupGeometry = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ResizeEdge = 'n' | 'w' | 'nw';

type DragResizeOptions = {
  enabled: boolean;
  isOpen: boolean;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
};

const VIEWPORT_MARGIN = 12;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeCenteredPopupGeometry(width: number, height: number): PopupGeometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(width, vw - VIEWPORT_MARGIN * 2);
  const h = Math.min(height, vh - VIEWPORT_MARGIN * 2);
  return {
    w,
    h,
    x: Math.max(VIEWPORT_MARGIN, (vw - w) / 2),
    y: Math.max(VIEWPORT_MARGIN, (vh - h) / 2),
  };
}

function getMaxPopupSize(): { w: number; h: number } {
  return {
    w: window.innerWidth - VIEWPORT_MARGIN * 2,
    h: window.innerHeight - VIEWPORT_MARGIN * 2,
  };
}

function parseResizeEdge(data: string | undefined): ResizeEdge | null {
  if (!data) return null;
  if (data === 'n' || data === 'w' || data === 'nw') return data;
  return null;
}

export function usePopupDragResize({
  enabled,
  isOpen,
  defaultWidth,
  defaultHeight,
  minWidth,
  minHeight,
}: DragResizeOptions) {
  const [geometry, setGeometry] = useState<PopupGeometry>(() =>
    computeCenteredPopupGeometry(defaultWidth, defaultHeight),
  );
  const [isInteracting, setIsInteracting] = useState(false);

  const dragRef = useRef<{
    mode: 'move' | 'resize';
    edge?: ResizeEdge;
    startX: number;
    startY: number;
    startGeom: PopupGeometry;
    pointerId: number;
    captureTarget: Element | null;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !isOpen) return;
    setGeometry(computeCenteredPopupGeometry(defaultWidth, defaultHeight));
  }, [enabled, isOpen, defaultWidth, defaultHeight]);

  const onPointerMove = useCallback(
    (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      ev.preventDefault();

      const max = getMaxPopupSize();
      const { startGeom, startX, startY } = d;

      if (d.mode === 'move') {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const x = clamp(
          startGeom.x + dx,
          VIEWPORT_MARGIN,
          window.innerWidth - startGeom.w - VIEWPORT_MARGIN,
        );
        const y = clamp(
          startGeom.y + dy,
          VIEWPORT_MARGIN,
          window.innerHeight - startGeom.h - VIEWPORT_MARGIN,
        );
        setGeometry({ ...startGeom, x, y });
        return;
      }

      const edge = d.edge;
      if (!edge) return;

      let dw = 0;
      let dh = 0;
      if (edge === 'w' || edge === 'nw') dw += startX - ev.clientX;
      if (edge === 'n' || edge === 'nw') dh += startY - ev.clientY;

      const w = clamp(startGeom.w + dw, minWidth, max.w);
      const h = clamp(startGeom.h + dh, minHeight, max.h);
      const x = startGeom.x + (startGeom.w - w);
      const y = startGeom.y + (startGeom.h - h);

      setGeometry({
        w,
        h,
        x: clamp(x, VIEWPORT_MARGIN, window.innerWidth - w - VIEWPORT_MARGIN),
        y: clamp(y, VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN),
      });
    },
    [minHeight, minWidth],
  );

  const startPointerSession = useCallback(
    (
      ev: React.PointerEvent,
      mode: 'move' | 'resize',
      edge?: ResizeEdge,
    ) => {
      if (!enabled || ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();

      dragRef.current = {
        mode,
        edge,
        startX: ev.clientX,
        startY: ev.clientY,
        startGeom: geometry,
        pointerId: ev.pointerId,
        captureTarget: ev.currentTarget,
      };

      try {
        ev.currentTarget.setPointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }

      setIsInteracting(true);

      const onUp = (upEv: PointerEvent) => {
        if (dragRef.current?.pointerId !== upEv.pointerId) return;
        upEv.preventDefault();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (dragRef.current.captureTarget && 'releasePointerCapture' in dragRef.current.captureTarget) {
          try {
            dragRef.current.captureTarget.releasePointerCapture(upEv.pointerId);
          } catch {
            /* ignore */
          }
        }
        dragRef.current = null;
        setIsInteracting(false);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onUp, { passive: false });
      window.addEventListener('pointercancel', onUp, { passive: false });
    },
    [enabled, geometry, onPointerMove],
  );

  const onTitlePointerDown = useCallback(
    (ev: React.PointerEvent) => {
      const target = ev.target as HTMLElement;
      if (target.closest('button, a, input, textarea, select, [role="button"]')) return;
      startPointerSession(ev, 'move');
    },
    [startPointerSession],
  );

  const onResizePointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const edge = parseResizeEdge(ev.currentTarget.dataset.resizeEdge);
      if (!edge) return;
      startPointerSession(ev, 'resize', edge);
    },
    [startPointerSession],
  );

  return {
    geometry,
    isInteracting,
    onTitlePointerDown,
    onResizePointerDown,
  };
}
