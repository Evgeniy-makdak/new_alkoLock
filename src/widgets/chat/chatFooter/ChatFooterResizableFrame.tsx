import { type ReactNode, useCallback, useRef, useState } from 'react';

import styles from './ChatFooter.module.scss';

export type ChatFooterPanelSize = { w: number; h: number };

type ResizeEdge = 'n' | 'w' | 'nw';

type Props = {
  size: ChatFooterPanelSize;
  onSizeLiveChange: (next: ChatFooterPanelSize) => void;
  onSizeCommit: (next: ChatFooterPanelSize) => void;
  minSize: ChatFooterPanelSize;
  getMaxSize: () => ChatFooterPanelSize;
  children: ReactNode;
};

function clampSize(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function parseEdge(data: string | undefined): ResizeEdge | null {
  if (!data) return null;
  const e = data as ResizeEdge;
  if (['n', 'w', 'nw'].includes(e)) return e;
  return null;
}

export function ChatFooterResizableFrame({
  size,
  onSizeLiveChange,
  onSizeCommit,
  minSize,
  getMaxSize,
  children,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    edge: ResizeEdge;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    pointerId: number;
    lastW: number;
    lastH: number;
    captureTarget: Element | null;
  } | null>(null);

  const applyPointerDelta = useCallback(
    (edge: ResizeEdge, clientX: number, clientY: number) => {
      const d = dragRef.current;
      if (!d) return;
      const max = getMaxSize();
      let dw = 0;
      let dh = 0;
      const includesLeft = edge === 'w' || edge === 'nw';
      const includesTop = edge === 'n' || edge === 'nw';

      if (includesLeft) dw += d.startX - clientX;
      if (includesTop) dh += d.startY - clientY;

      const nextW = clampSize(d.startW + dw, minSize.w, max.w);
      const nextH = clampSize(d.startH + dh, minSize.h, max.h);
      d.lastW = nextW;
      d.lastH = nextH;
      onSizeLiveChange({ w: nextW, h: nextH });
    },
    [getMaxSize, minSize.h, minSize.w, onSizeLiveChange],
  );

  const onPointerMove = useCallback(
    (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      ev.preventDefault();
      applyPointerDelta(d.edge, ev.clientX, ev.clientY);
    },
    [applyPointerDelta],
  );

  const onPointerUp = useCallback(
    (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      ev.preventDefault();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (d.captureTarget && 'releasePointerCapture' in d.captureTarget) {
        try {
          (d.captureTarget as Element).releasePointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
      }

      onSizeCommit({ w: d.lastW, h: d.lastH });
      dragRef.current = null;
      setIsDragging(false);
    },
    [onPointerMove, onSizeCommit],
  );

  const onHandlePointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const edge = parseEdge(ev.currentTarget.dataset.resizeEdge);
      if (!edge || ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      dragRef.current = {
        edge,
        startX: ev.clientX,
        startY: ev.clientY,
        startW: size.w,
        startH: size.h,
        pointerId: ev.pointerId,
        lastW: size.w,
        lastH: size.h,
        captureTarget: ev.currentTarget,
      };
      try {
        ev.currentTarget.setPointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      setIsDragging(true);
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { passive: false });
      window.addEventListener('pointercancel', onPointerUp, { passive: false });
    },
    [onPointerMove, onPointerUp, size.h, size.w],
  );

  return (
    <div
      className={`${styles.chatFooterResizeRoot} ${isDragging ? styles.chatFooterResizeRootDragging : ''}`}
      style={{ width: size.w, height: size.h }}>
      <div className={styles.chatFooterResizeInner}>{children}</div>
      <div
        className={`${styles.resizeHandle} ${styles.resizeN}`}
        data-resize-edge="n"
        onPointerDown={onHandlePointerDown}
        aria-hidden
      />
      <div
        className={`${styles.resizeHandle} ${styles.resizeW}`}
        data-resize-edge="w"
        onPointerDown={onHandlePointerDown}
        aria-hidden
      />
      <div
        className={`${styles.resizeHandle} ${styles.resizeNw}`}
        data-resize-edge="nw"
        onPointerDown={onHandlePointerDown}
        aria-hidden
      />
    </div>
  );
}
