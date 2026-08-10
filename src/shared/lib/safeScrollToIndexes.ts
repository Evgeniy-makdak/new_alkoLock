import type { MutableRefObject } from 'react';

import type { GridApiCommon, GridCellIndexCoordinates } from '@mui/x-data-grid';

type GridApiRefLike =
  | MutableRefObject<GridApiCommon | null | undefined>
  | { current: GridApiCommon | null | undefined }
  | null
  | undefined;

/**
 * Safe wrapper around DataGrid `scrollToIndexes`.
 *
 * MUI X v6 `scrollToIndexes` reads `virtualScrollerRef.current` without checking that
 * `virtualScrollerRef` itself exists. During rapid browser zoom (especially Firefox)
 * the scroller ref can be briefly undefined → crash:
 * `can't access property "current", w is undefined`.
 *
 * @see https://github.com/mui/mui-x/issues/4674
 */
export function safeScrollToIndexes(
  apiRef: GridApiRefLike,
  coords: Partial<GridCellIndexCoordinates>,
): boolean {
  const api = apiRef?.current;
  if (!api || typeof api.scrollToIndexes !== 'function') {
    return false;
  }

  // virtualScrollerRef is on the runtime Grid API but not on GridApiCommon typings
  const virtualScrollerRef = (
    api as GridApiCommon & { virtualScrollerRef?: { current: unknown } }
  ).virtualScrollerRef;
  if (!virtualScrollerRef?.current) {
    return false;
  }

  return Boolean(api.scrollToIndexes(coords));
}
