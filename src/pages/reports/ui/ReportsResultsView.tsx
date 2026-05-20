import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import {
  buildReportSortParams,
  getDefaultReportSortModel,
  reportSortParamsEqual,
} from '@pages/reports/lib/buildReportSortParam';
import {
  getReportGridRowId,
  mapReportContentToResultGrid,
} from '@pages/reports/lib/mapReportContentToResultGrid';
import {
  DEVICE_EVENT_REPORT_ROW_COLUMNS,
  getReportResultColumnMeta,
} from '@pages/reports/lib/reportResultTableColumns';
import { SortsTypes } from '@shared/config/queryParamsEnums';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { Table } from '@shared/components/Table/Table';
import { StorageKeys } from '@shared/const/storageKeys';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';

import styles from './Reports.module.scss';

export function ReportsResultsView() {
  const { t } = useTranslation();
  const vehicleLabelMaps = reportsStore((s) => s.vehicleLabelMaps);
  const metadata = reportsStore((s) => s.metadata);
  const selectedOutputFields = reportsStore((s) => s.selectedOutputFields);
  const lastResult = reportGenerationStore((s) => s.lastResult);
  const isLoadingPage = reportGenerationStore((s) => s.isLoadingPage);
  const isGenerating = reportGenerationStore((s) => s.isGenerating);
  const queryContext = reportGenerationStore((s) => s.queryContext);
  const storePagination = reportGenerationStore((s) => s.pagination);
  const loadReportPage = reportGenerationStore((s) => s.loadReportPage);
  const setPagination = reportGenerationStore((s) => s.setPagination);
  const setSort = reportGenerationStore((s) => s.setSort);

  const [tableState, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.REPORTS_TABLE_SORTS,
    [{ field: '__reportRowCreatedAt', sort: SortsTypes.desc }],
  );

  const pageSizeRef = useRef(tableState.pageSize);
  pageSizeRef.current = tableState.pageSize;

  const lastSyncedReportKeyRef = useRef<string | null>(null);

  const reportTableKey = useMemo(
    () =>
      queryContext
        ? `${queryContext.entityName}:${JSON.stringify(queryContext.body)}`
        : 'report-empty',
    [queryContext],
  );

  const primaryField = useMemo(() => {
    const key = selectedOutputFields[0] ? String(selectedOutputFields[0].value) : '';
    if (!key || !metadata?.fields) return null;
    return metadata.fields.find((f) => f.fieldName === key) ?? null;
  }, [selectedOutputFields, metadata]);

  const reportEntityName = queryContext?.entityName ?? null;

  const reportColumnMeta = useMemo(() => {
    const refColumns = getReportResultColumnMeta(primaryField) ?? [];
    if (reportEntityName === 'DeviceEvent' && primaryField?.referenceEntity) {
      return [...DEVICE_EVENT_REPORT_ROW_COLUMNS, ...refColumns];
    }
    return refColumns;
  }, [primaryField, reportEntityName]);

  const nestedFieldName = primaryField?.fieldName ?? null;

  // Сброс страницы и сортировки только при новом запросе отчёта. changeTable* нестабильны — не в deps.
  useEffect(() => {
    if (!queryContext) {
      lastSyncedReportKeyRef.current = null;
      return;
    }
    if (lastSyncedReportKeyRef.current === reportTableKey) return;
    lastSyncedReportKeyRef.current = reportTableKey;

    const pageSize = pageSizeRef.current;
    const defaultSortModel = getDefaultReportSortModel(reportColumnMeta);
    const defaultSortParams = buildReportSortParams(defaultSortModel, nestedFieldName);

    changeTableState({ page: 0, pageSize });
    changeTableSorts(defaultSortModel);
    setPagination({ page: 0, pageSize });
    setSort(defaultSortParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once per reportTableKey
  }, [reportTableKey, queryContext]);

  const rowIdOffset = storePagination.page * storePagination.pageSize;

  const { columns, rows } = useMemo(() => {
    if (!lastResult?.content?.length) {
      return { columns: [], rows: [] };
    }
    return mapReportContentToResultGrid(
      lastResult.content,
      primaryField,
      rowIdOffset,
      t,
      vehicleLabelMaps,
      reportEntityName,
    );
  }, [lastResult, primaryField, rowIdOffset, vehicleLabelMaps, t, reportEntityName]);

  const handlePaginationModelChange = useCallback(
    (model: GridPaginationModel) => {
      const { pagination, queryContext: ctx, isLoadingPage, isGenerating } =
        reportGenerationStore.getState();
      if (!ctx || isLoadingPage || isGenerating) return;

      const pageSizeChanged = pagination.pageSize !== model.pageSize;
      const nextPage = pageSizeChanged ? 0 : model.page;

      if (
        !pageSizeChanged &&
        nextPage === pagination.page &&
        model.pageSize === pagination.pageSize
      ) {
        return;
      }

      pageSizeRef.current = model.pageSize;
      changeTableState({ page: nextPage, pageSize: model.pageSize });
      void loadReportPage(nextPage, model.pageSize);
    },
    [changeTableState, loadReportPage],
  );

  const handleSortModelChange = useCallback(
    (model: GridSortModel) => {
      changeTableSorts(model);

      const { queryContext: ctx, isLoadingPage, isGenerating, pagination, sort } =
        reportGenerationStore.getState();
      if (!ctx || isLoadingPage || isGenerating) return;

      const nextSort = buildReportSortParams(model, nestedFieldName);
      if (reportSortParamsEqual(sort, nextSort)) return;

      setSort(nextSort);
      changeTableState({ page: 0, pageSize: pagination.pageSize });
      setPagination({ page: 0 });
      void loadReportPage(0, pagination.pageSize);
    },
    [changeTableSorts, changeTableState, loadReportPage, nestedFieldName, setPagination, setSort],
  );

  const totalElements = lastResult?.totalElements ?? 0;

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.scrollableTable}>
        <Table
          key={reportTableKey}
          columns={columns}
          rows={rows}
          rowCount={totalElements}
          paginationMode="server"
          sortingMode="server"
          sortModel={tableState.sortModel}
          onSortModelChange={handleSortModelChange}
          apiRef={apiRef}
          pageNumber={storePagination.page}
          pageSize={storePagination.pageSize}
          loading={isGenerating || isLoadingPage}
          onPaginationModelChange={handlePaginationModelChange}
          getRowId={getReportGridRowId}
          pointer={false}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 75, 100]}
          hideFooterSelectedRowCount
        />
      </div>
    </div>
  );
}
