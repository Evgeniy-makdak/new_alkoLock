/* eslint-disable react-hooks/exhaustive-deps */
import { type MutableRefObject, useEffect, useRef } from 'react';

import { type GridPaginationModel, type GridSortModel, useGridApiRef } from '@mui/x-data-grid';
import type { GridApiCommunity } from '@mui/x-data-grid/internals';

import type { StorageKeys } from '@shared/const/storageKeys';

import { useLocalStorage } from './useLocalStorage';

/**
 *
 * @param key => уникальный ключ под которым в localStorage будут сохранены все данные таблицы
 * @param sortModel => {@link GridSortModel}
 * @returns [
 *    * state - текущее состояние таблицы
 *    * apiRef - ref для таблицы с котрой хотим взять данные
 *    * changeTableState - функция для изменения состояния таблицы
 *    * changeTableSorts - функция для изменения конкретно сортировок у таблицы
 *
 * ]
 */
export const useSavedLocalTableSorts = (
  key: StorageKeys,
  sortModel?: GridSortModel,
): [
  {
    sortModel: GridSortModel;
    page: number;
    pageSize: number;
  },
  MutableRefObject<GridApiCommunity>,
  (stateOfTable: GridPaginationModel) => void,
  (model: GridSortModel) => void,
] => {
  const apiRef = useGridApiRef();
  const { state, setItemState } = useLocalStorage({
    key,
    value: {
      sortModel: sortModel
        ? sortModel
        : (apiRef?.current?.getSortModel && apiRef?.current?.getSortModel()) || [],
      page: apiRef?.current?.state?.pagination?.paginationModel?.page || 0,
      pageSize: apiRef?.current?.state?.pagination?.paginationModel?.pageSize || 25,
    },
  });

  // Всегда указывает на последнее актуальное состояние (предотвращает stale closure).
  // changeTableState/changeTableSorts вызываются из обратных вызовов DataGrid,
  // которые могут захватить устаревший state через замыкание.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Флаг: блокирует обратные вызовы DataGrid (onPaginationModelChange, onSortModelChange)
  // во время программного восстановления состояния из localStorage. Без него
  // setSortModel / setPage синхронно стреляют коллбеками с новыми ссылками объектов
  // и перезаписывают текущую страницу через changeTableSorts (stale closure на state).
  const isRestoring = useRef(false);

  const changeTableState = (stateOfTable: GridPaginationModel) => {
    if (isRestoring.current) return;
    setItemState({
      ...stateRef.current,
      page: stateOfTable.page,
      pageSize: stateOfTable.pageSize,
    });
  };

  const changeTableSorts = (model: GridSortModel) => {
    if (isRestoring.current) return;
    setItemState({
      ...stateRef.current,
      sortModel: model,
    });
  };

  useEffect(() => {
    if (!apiRef?.current) return;

    isRestoring.current = true;
    apiRef?.current?.setPage && apiRef?.current?.setPage(state.page);
    apiRef?.current?.setPageSize && apiRef?.current?.setPageSize(state.pageSize);
    apiRef?.current?.setSortModel && apiRef?.current?.setSortModel(state.sortModel);
    isRestoring.current = false;
  }, [apiRef?.current]);

  return [state, apiRef, changeTableState, changeTableSorts];
};
