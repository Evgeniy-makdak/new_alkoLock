import {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type Ref,
} from 'react';

import { Tooltip, useMediaQuery, type TooltipProps } from '@mui/material';

import { MobileOverflowTextDialog } from './MobileOverflowTextDialog';
import { findOverflowTarget, isElementOverflowing } from './overflowMeasure';
import styles from './OverflowTooltip.module.scss';

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): (instance: T | null) => void {
  return (instance) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') {
        ref(instance);
      } else {
        (ref as React.MutableRefObject<T | null>).current = instance;
      }
    }
  };
}

export type OverflowTooltipProps = Omit<TooltipProps, 'title' | 'children'> & {
  title: string;
  children: ReactElement;
};

/** Десктоп / Electron: tooltip только при ellipsis. Мобильный / PWA (≤768px): тап → диалог снизу. */
export function OverflowTooltip({ title, children, ...tooltipProps }: OverflowTooltipProps) {
  const isMobile = useMediaQuery('(max-width:768px)');
  const rootRef = useRef<HTMLElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    setOverflows(isElementOverflowing(findOverflowTarget(root)));
  }, []);

  useLayoutEffect(() => {
    measure();
    // Повтор после layout/шрифтов — иначе scrollWidth может ещё не отражать ellipsis.
    const id = window.requestAnimationFrame(() => {
      measure();
      window.requestAnimationFrame(measure);
    });
    return () => window.cancelAnimationFrame(id);
  }, [measure, title]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    const target = findOverflowTarget(root);
    if (target !== root) {
      ro.observe(target);
    }
    return () => ro.disconnect();
  }, [measure, title, children]);

  const child = cloneElement(children, {
    ref: mergeRefs(rootRef, (children as ReactElement & { ref?: Ref<HTMLElement> }).ref),
    onMouseEnter: (event: MouseEvent) => {
      measure();
      const prev = (children.props as { onMouseEnter?: (e: MouseEvent) => void }).onMouseEnter;
      prev?.(event);
    },
  });

  const trimmedTitle = title.trim();
  const canExpand = overflows && Boolean(trimmedTitle);

  const openDialog = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setDialogOpen(true);
  };

  if (isMobile && canExpand) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          className={styles.mobileTruncatedClickable}
          onClick={openDialog}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              openDialog(e);
            }
          }}>
          {child}
        </div>
        <MobileOverflowTextDialog
          open={dialogOpen}
          text={trimmedTitle}
          onClose={() => setDialogOpen(false)}
        />
      </>
    );
  }

  return (
    <Tooltip
      arrow
      placement="top"
      {...tooltipProps}
      title={canExpand ? trimmedTitle : ''}
      disableHoverListener={!canExpand}>
      {child}
    </Tooltip>
  );
}
