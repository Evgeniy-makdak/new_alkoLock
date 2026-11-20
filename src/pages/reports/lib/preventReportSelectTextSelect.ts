import type { MouseEvent } from 'react';

import type { SxProps, Theme } from '@mui/material';

/**
 * Двойной клик по контролам тулбара отчётов/дашборда (в т.ч. по верхней кромке
 * floating label) иначе выделяет ближайший selectable-текст — часто заголовок
 * колонки таблицы («Отчет…»).
 */
export const reportToolbarSelectNoTextSelectSx: SxProps<Theme> = {
  userSelect: 'none',
  '& .MuiSelect-select, & .MuiInputBase-root, & .MuiInputLabel-root, & .MuiButton-root':
    {
      userSelect: 'none',
    },
};

/** 2-й/3-й клик: не начинать native text selection (detail > 1). */
export function preventMultiClickTextSelection(event: MouseEvent): void {
  if (event.detail > 1) {
    event.preventDefault();
  }
}

export function clearTextSelectionOnDoubleClick(event: MouseEvent): void {
  event.preventDefault();
  window.getSelection()?.removeAllRanges();
}
