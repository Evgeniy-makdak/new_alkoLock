import {
  cloneElement,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';

import { Tooltip, useMediaQuery, type TooltipProps } from '@mui/material';

import { MobileOverflowTextDialog } from '@shared/ui/overflow_tooltip/MobileOverflowTextDialog';

import { breakpoints } from '../breakpoints';

const LONG_PRESS_MS = 450;

type NavBarItemHintProps = {
  title: string;
  /** Подпись скрыта (свёрнутая колонка / мобильные иконки) — показываем подсказку. */
  showHint: boolean;
  children: ReactElement;
  tooltipProps?: Omit<TooltipProps, 'title' | 'children'>;
};

/**
 * Свёрнутый navbar: десктоп/Electron — tooltip справа при hover;
 * мобильный/PWA — удержание → диалог снизу (как OverflowTooltip).
 */
export function NavBarItemHint({ title, children, showHint, tooltipProps }: NavBarItemHintProps) {
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);
  const isTouchLayout = isMobile || isTablet;
  const [dialogOpen, setDialogOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressOpenedRef = useRef(false);

  const trimmedTitle = title.trim();
  if (!showHint || !trimmedTitle) {
    return children;
  }

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (isTouchLayout) {
    const child = cloneElement(children, {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        children.props.onPointerDown?.(event);
        longPressOpenedRef.current = false;
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          longPressOpenedRef.current = true;
          setDialogOpen(true);
        }, LONG_PRESS_MS);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        children.props.onPointerUp?.(event);
        clearLongPressTimer();
      },
      onPointerCancel: (event: PointerEvent<HTMLElement>) => {
        children.props.onPointerCancel?.(event);
        clearLongPressTimer();
      },
      onPointerLeave: (event: PointerEvent<HTMLElement>) => {
        children.props.onPointerLeave?.(event);
        clearLongPressTimer();
      },
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (longPressOpenedRef.current) {
          event.preventDefault();
          event.stopPropagation();
          longPressOpenedRef.current = false;
          return;
        }
        children.props.onClick?.(event);
      },
    });

    return (
      <>
        {child}
        <MobileOverflowTextDialog
          open={dialogOpen}
          text={trimmedTitle}
          onClose={() => setDialogOpen(false)}
        />
      </>
    );
  }

  return (
    <Tooltip {...tooltipProps} title={trimmedTitle}>
      {children}
    </Tooltip>
  );
}
