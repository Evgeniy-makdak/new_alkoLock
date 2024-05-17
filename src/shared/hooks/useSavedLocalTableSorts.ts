import { type MutableRefObject, useEffect } from 'react';

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

  const changeTableState = (stateOfTable: GridPaginationModel) => {
    setItemState({
      ...state,
      page: stateOfTable.page,
      pageSize: stateOfTable.pageSize,
    });
  };

  const changeTableSorts = (model: GridSortModel) => {
    setItemState({
      ...state,
      sortModel: model,
    });
  };

  useEffect(() => {
    if (!apiRef?.current) return;

    apiRef?.current?.setPage && apiRef?.current?.setPage(state.page);
    apiRef?.current?.setPageSize && apiRef?.current?.setPageSize(state.pageSize);
    apiRef?.current?.setSortModel && apiRef?.current?.setSortModel(state.sortModel);
  }, [apiRef?.current]);

  return [state, apiRef, changeTableState, changeTableSorts];
};
