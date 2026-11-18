import type { MutableRefObject } from 'react';

import type { GridApiCommon, GridCellIndexCoordinates } from '@mui/x-data-grid';
import { unwrapPrivateAPI } from '@mui/x-data-grid/internals';

type GridApiRefLike =
  | MutableRefObject<GridApiCommon | null | undefined>
  | { current?: unknown }
  | null
  | undefined;

type ScrollFn = (coords: Partial<GridCellIndexCoordinates>) => boolean;

type GridApiWithScroll = {
  scrollToIndexes?: ScrollFn;
  virtualScrollerRef?: { current: unknown };
  __alkoSafeScrollToIndexes?: boolean;
  register?: (visibility: string, methods: Record<string, unknown>) => void;
};

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
  const api = apiRef?.current as GridApiWithScroll | null | undefined;
  if (!api || typeof api.scrollToIndexes !== 'function') {
    return false;
  }

  if (!api.virtualScrollerRef?.current) {
    return false;
  }

  try {
    return Boolean(api.scrollToIndexes(coords));
  } catch {
    return false;
  }
}

function patchScrollToIndexesOnApi(api: GridApiWithScroll | null | undefined): boolean {
  if (!api) return false;
  if (api.__alkoSafeScrollToIndexes) return true;

  let impl: ScrollFn | undefined =
    typeof api.scrollToIndexes === 'function' ? api.scrollToIndexes.bind(api) : undefined;

  const safeFn: ScrollFn = (coords) => {
    // Не вызываем оригинальный MUI-код, если scroller ещё не готов:
    // у useGridScroll closed-over virtualScrollerRef может быть undefined
    // даже когда live api.virtualScrollerRef уже есть.
    try {
      if (typeof impl !== 'function') return false;
      return Boolean(impl(coords));
    } catch {
      return false;
    }
  };

  try {
    Object.defineProperty(api, 'scrollToIndexes', {
      configurable: true,
      enumerable: true,
      get() {
        return safeFn;
      },
      set(fn: ScrollFn | undefined) {
        impl = typeof fn === 'function' ? fn.bind(api) : undefined;
      },
    });
    api.__alkoSafeScrollToIndexes = true;
    return true;
  } catch {
    try {
      api.scrollToIndexes = safeFn;
    } catch {
      // ignore
    }
    return false;
  }
}

function resolvePrivateApi(publicApi: GridApiWithScroll): GridApiWithScroll | null {
  try {
    return unwrapPrivateAPI(publicApi as never) as GridApiWithScroll;
  } catch {
    const symbols = Object.getOwnPropertySymbols(publicApi);
    for (const sym of symbols) {
      const value = (publicApi as Record<symbol, unknown>)[sym];
      if (value && typeof value === 'object' && typeof (value as GridApiWithScroll).register === 'function') {
        return value as GridApiWithScroll;
      }
    }
    return null;
  }
}

/**
 * Патч scrollToIndexes на public И private API.
 *
 * paginationModelChange в MUI вызывает privateApi.scrollToIndexes — патч только
 * public (apiRef с useGridApiRef) краш не останавливал.
 * defineProperty: useGridApiMethod в useEffect снова присваивает метод — setter
 * сохраняет новую impl, getter всегда отдаёт обёртку с try/catch.
 */
export function ensureSafeGridScrollToIndexes(apiRef: GridApiRefLike): boolean {
  const publicApi = apiRef?.current as GridApiWithScroll | null | undefined;
  if (!publicApi) return false;

  const publicOk = patchScrollToIndexesOnApi(publicApi);
  const privateApi = resolvePrivateApi(publicApi);
  const privateOk = privateApi && privateApi !== publicApi ? patchScrollToIndexesOnApi(privateApi) : true;

  return publicOk && Boolean(privateOk);
}
