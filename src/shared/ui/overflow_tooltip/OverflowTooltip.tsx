import {
  cloneElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from 'react';

import { Tooltip, type TooltipProps } from '@mui/material';

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

function findOverflowTarget(root: HTMLElement): HTMLElement {
  return (
    root.querySelector<HTMLElement>('.MuiInputBase-input') ??
    root.querySelector<HTMLElement>('.MuiChip-label') ??
    root.querySelector<HTMLElement>('.MuiAutocomplete-input') ??
    root
  );
}

function isElementOverflowing(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
}

export type OverflowTooltipProps = Omit<TooltipProps, 'title' | 'children'> & {
  title: string;
  children: ReactElement;
};

/** Tooltip только если текст внутри обрезан (ellipsis). */
export function OverflowTooltip({ title, children, ...tooltipProps }: OverflowTooltipProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [overflows, setOverflows] = useState(false);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    setOverflows(isElementOverflowing(findOverflowTarget(root)));
  }, []);

  useEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const target = findOverflowTarget(root);
    if (target !== root) {
      ro.observe(target);
    }
    return () => ro.disconnect();
  }, [measure, title, children]);

  const child = cloneElement(children, {
    ref: mergeRefs(
      rootRef,
      (children as ReactElement & { ref?: Ref<HTMLElement> }).ref,
    ),
  });

  const trimmedTitle = title.trim();

  return (
    <Tooltip
      arrow
      placement="top"
      {...tooltipProps}
      title={trimmedTitle}
      disableHoverListener={!overflows || !trimmedTitle}>
      {child}
    </Tooltip>
  );
}
