import type { GridSortModel } from '@mui/x-data-grid';

import { DEFAULT_REPORT_PAGE_SIZE } from '@pages/reports/model/reportGenerationStore';
import { StorageKeys } from '@shared/const/storageKeys';
import { getItem, setItem } from '@shared/model/store/localStorage';

type ReportsTableStorage = {
  sortModel: GridSortModel;
  page: number;
  pageSize: number;
};

/** Сброс страницы/сортировки таблицы отчётов в localStorage (десктоп DataGrid). */
export function resetReportsTablePaginationStorage(pageSize = DEFAULT_REPORT_PAGE_SIZE): void {
  const stored = getItem<ReportsTableStorage>(StorageKeys.REPORTS_TABLE_SORTS);
  setItem(StorageKeys.REPORTS_TABLE_SORTS, {
    sortModel: [],
    page: 0,
    pageSize: stored?.pageSize ?? pageSize,
  });
}
