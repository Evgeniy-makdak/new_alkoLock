import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useMediaQuery } from '@mui/material';
import type { GridPaginationModel } from '@mui/x-data-grid';

import {
  buildReportSortFieldMap,
  buildReportSortParams,
  reportSortParamsEqual,
} from '@pages/reports/lib/buildReportSortParam';
import {
  getReportGridRowId,
  mapReportContentToResultGrid,
} from '@pages/reports/lib/mapReportContentToResultGrid';
import { resetReportsTablePaginationStorage } from '@pages/reports/lib/resetReportsTablePaginationStorage';
import { buildReportColumnAliasMap } from '@pages/reports/lib/reportSelectedFieldAliases';
import { shouldLoadVehicleLabelMaps } from '@pages/reports/lib/reportVehicleContext';
import { getPrimaryReportOutputRow } from '@pages/reports/model/reportsStore';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { Table } from '@shared/components/Table/Table';
import { StorageKeys } from '@shared/const/storageKeys';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import styles from './Reports.module.scss';

export function ReportsResultsView() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const vehicleLabelMaps = reportsStore((s) => s.vehicleLabelMaps);
  const loadVehicleLabelMaps = reportsStore((s) => s.loadVehicleLabelMaps);
  const metadata = reportsStore((s) => s.metadata);
  const entities = reportsStore((s) => s.entities);
  const outputRows = reportsStore((s) => s.outputRows);
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
    [],
  );

  const pageSizeRef = useRef(tableState.pageSize);
  pageSizeRef.current = tableState.pageSize;

  const lastSyncedReportKeyRef = useRef<string | null>(null);
  /** Блокирует sort-effect на кадре сброса (stale sortModel до setState). */
  const suppressSortFetchRef = useRef(false);

  const reportTableKey = useMemo(
    () =>
      queryContext
        ? `${queryContext.entityName}:${JSON.stringify(queryContext.body)}`
        : 'report-empty',
    [queryContext],
  );

  const primaryField = useMemo(() => {
    const primaryRow = getPrimaryReportOutputRow();
    const key = primaryRow.selectedOutputFields[0] ? String(primaryRow.selectedOutputFields[0].value) : '';
    if (!key || !metadata?.fields) return null;
    return metadata.fields.find((f) => f.fieldName === key) ?? null;
  }, [outputRows, metadata]);

  const reportTableFieldsMetadataByRowId = reportsStore(
    (s) => s.reportTableFieldsMetadataByRowId,
  );
  const referenceEntityMetadataByName = reportsStore((s) => s.referenceEntityMetadataByName);
  const activeOutputRows = useMemo(
    () => outputRows.filter((row) => row.selectedOutputFields.length > 0),
    [outputRows],
  );
  const fieldMap = useMemo(
    () => new Map((metadata?.fields ?? []).map((f) => [f.fieldName, f])),
    [metadata],
  );

  const reportEntityName = metadata?.entityName ?? null;
  const contentColumnKeysSig = lastResult?.content?.length
    ? Object.keys(lastResult.content[0] ?? {}).join('\0')
    : '';

  useEffect(() => {
    if (!reportEntityName) return;
    if (
      shouldLoadVehicleLabelMaps({
        entityMetadata: metadata,
        contentColumnKeys: contentColumnKeysSig ? contentColumnKeysSig.split('\0') : [],
      })
    ) {
      void loadVehicleLabelMaps();
    }
  }, [reportEntityName, contentColumnKeysSig, loadVehicleLabelMaps, metadata]);

  const paginationModel = useMemo(
    () => ({ page: storePagination.page, pageSize: storePagination.pageSize }),
    [storePagination.page, storePagination.pageSize],
  );

  // Сброс страницы и сортировки при новом отчёте или после «Очистить фильтры». changeTable* нестабильны — не в deps.
  useLayoutEffect(() => {
    if (!queryContext) {
      lastSyncedReportKeyRef.current = null;
      const pageSize = pageSizeRef.current;
      resetReportsTablePaginationStorage(pageSize);
      setPagination({ page: 0, pageSize });
      setSort([]);
      changeTableState({ page: 0, pageSize });
      changeTableSorts([]);
      apiRef.current?.setSortModel?.([]);
      apiRef.current?.setPage?.(0);
      apiRef.current?.setPaginationModel?.({ page: 0, pageSize });
      return;
    }
    if (lastSyncedReportKeyRef.current === reportTableKey) return;
    lastSyncedReportKeyRef.current = reportTableKey;
    suppressSortFetchRef.current = true;

    const pageSize = pageSizeRef.current;

    changeTableState({ page: 0, pageSize });
    changeTableSorts([]);
    apiRef.current?.setSortModel?.([]);
    apiRef.current?.setPage?.(0);
    setPagination({ page: 0, pageSize });
    setSort([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once per reportTableKey
  }, [reportTableKey, queryContext]);

  const rowIdOffset = storePagination.page * storePagination.pageSize;

  const columnAliases = useMemo(
    () => buildReportColumnAliasMap(queryContext?.body.selectedFields),
    [queryContext?.body.selectedFields],
  );

  const sortFieldByColumn = useMemo(() => {
    if (!queryContext?.body.selectedFields || !metadata?.entityName) {
      return new Map<string, string>();
    }
    return buildReportSortFieldMap(queryContext.body.selectedFields);
  }, [queryContext?.body.selectedFields]);

  const frozenColumnHeaderLabels = queryContext?.columnHeaderLabels;

  const { columns, rows } = useMemo(() => {
    if (!lastResult?.content?.length) {
      return { columns: [], rows: [] };
    }
    const grid = mapReportContentToResultGrid(
      lastResult.content,
      primaryField,
      rowIdOffset,
      t,
      vehicleLabelMaps,
      metadata,
      activeOutputRows,
      fieldMap,
      reportTableFieldsMetadataByRowId,
      columnAliases,
      referenceEntityMetadataByName,
      queryContext?.body.selectedFields,
      entities,
    );

    if (!frozenColumnHeaderLabels) {
      return grid;
    }

    return {
      ...grid,
      columns: grid.columns.map((col) => {
        const field = col.field;
        if (typeof field !== 'string') return col;
        const frozen = frozenColumnHeaderLabels[field];
        return frozen ? { ...col, headerName: frozen } : col;
      }),
    };
  }, [
    lastResult,
    primaryField,
    rowIdOffset,
    vehicleLabelMaps,
    t,
    metadata,
    activeOutputRows,
    fieldMap,
    reportTableFieldsMetadataByRowId,
    columnAliases,
    referenceEntityMetadataByName,
    queryContext?.body.selectedFields,
    entities,
    frozenColumnHeaderLabels,
  ]);

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

  // Как на вкладке «События»: onSortModelChange только сохраняет модель, запрос — по изменению sortModel.
  useEffect(() => {
    if (!queryContext) return;
    if (suppressSortFetchRef.current) {
      suppressSortFetchRef.current = false;
      return;
    }
    const { isGenerating, sort, pagination } = reportGenerationStore.getState();
    if (isGenerating) return;

    const nextSort = buildReportSortParams(tableState.sortModel, sortFieldByColumn);
    if (reportSortParamsEqual(sort, nextSort)) return;

    setSort(nextSort);
    changeTableState({ page: 0, pageSize: pagination.pageSize });
    setPagination({ page: 0 });
    apiRef.current?.setPage?.(0);
    void loadReportPage(0, pagination.pageSize);
  }, [
    queryContext,
    tableState.sortModel,
    tableState.sortModel[0]?.field,
    tableState.sortModel[0]?.sort,
    sortFieldByColumn,
    changeTableState,
    loadReportPage,
    setPagination,
    setSort,
    apiRef,
  ]);

  const totalElements = lastResult?.totalElements ?? 0;
  const showReportColumnHeaders = Boolean(queryContext && columns.length > 0);

  const handleMobilePageChange = useCallback(
    (newPage: number) => {
      handlePaginationModelChange({
        page: newPage,
        pageSize: storePagination.pageSize,
      });
    },
    [handlePaginationModelChange, storePagination.pageSize],
  );

  return (
    <div
      className={`${styles.tableWrapper} ${showReportColumnHeaders ? styles.tableAreaWithReportHeaders : ''}`}>
      <div
        className={`${styles.scrollableTable} ${showReportColumnHeaders ? '' : styles.scrollableTableHideColumnHeaders}`}>
        <Table
          key={reportTableKey}
          columns={columns}
          rows={rows}
          rowCount={totalElements}
          paginationMode="server"
          sortingMode="server"
          paginationModel={paginationModel}
          onSortModelChange={changeTableSorts}
          apiRef={apiRef}
          pageNumber={storePagination.page}
          pageSize={storePagination.pageSize}
          loading={isLoadingPage}
          onPaginationModelChange={handlePaginationModelChange}
          getRowId={getReportGridRowId}
          pointer={false}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 75, 100]}
          hideFooterSelectedRowCount
          sx={{
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'auto',
            },
          }}
        />
      </div>
      {isMobile ? (
        <div className={styles.mobilePagination}>
          <MobilePaginationWithJump
            page={storePagination.page}
            pageSize={storePagination.pageSize}
            totalCount={totalElements}
            loading={isLoadingPage || isGenerating}
            onPageChange={handleMobilePageChange}
          />
        </div>
      ) : null}
    </div>
  );
}
