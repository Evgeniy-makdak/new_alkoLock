import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useMediaQuery, Box, CircularProgress, IconButton, TablePagination, Tooltip, Typography } from '@mui/material';
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
import { normalizeChartSpec, CHART_REPORT_PAGE_SIZE, type ReportChartSpec } from '@pages/reports/types/chartSpec';
import { normalizeReportViewMode } from '@pages/reports/types/reportApiTypes';
import { MobilePaginationWithJump, TablePaginationJumpActions } from '@shared/components/Pagination';
import { Table } from '@shared/components/Table/Table';
import { StorageKeys } from '@shared/const/storageKeys';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import styles from './Reports.module.scss';
import { ReportChartCanvas } from './ReportChartCanvas';
import { ReportChartSettingsPanel } from './ReportChartSettingsPanel';

type ReportsRestoreState = {
  page: number;
  pageSize: number;
  sort: string[];
};

export function ReportsResultsView() {
  const { t } = useTranslation();
  const location = useLocation();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const vehicleLabelMaps = reportsStore((s) => s.vehicleLabelMaps);
  const loadVehicleLabelMaps = reportsStore((s) => s.loadVehicleLabelMaps);
  const metadata = reportsStore((s) => s.metadata);
  const entities = reportsStore((s) => s.entities);
  const outputRows = reportsStore((s) => s.outputRows);
  const lastResult = reportGenerationStore((s) => s.lastResult);
  const isLoadingPage = reportGenerationStore((s) => s.isLoadingPage);
  const isAppendingChart = reportGenerationStore((s) => s.isAppendingChart);
  const appendChartPage = reportGenerationStore((s) => s.appendChartPage);
  const isGenerating = reportGenerationStore((s) => s.isGenerating);
  const queryContext = reportGenerationStore((s) => s.queryContext);
  const storePagination = reportGenerationStore((s) => s.pagination);
  const loadReportPage = reportGenerationStore((s) => s.loadReportPage);
  const setPagination = reportGenerationStore((s) => s.setPagination);
  const setSort = reportGenerationStore((s) => s.setSort);
  const sort = reportGenerationStore((s) => s.sort);
  const viewMode = reportsStore((s) => normalizeReportViewMode(s.viewMode));
  const chartSpec = reportsStore((s) => s.chartSpec);
  const setChartSpec = reportsStore((s) => s.setChartSpec);

  const [tableState, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.REPORTS_TABLE_SORTS,
    [],
  );

  const pageSizeRef = useRef(tableState.pageSize);
  pageSizeRef.current = tableState.pageSize;

  const lastSyncedReportKeyRef = useRef<string | null>(null);
  /** Блокирует sort-effect на кадре сброса (stale sortModel до setState). */
  const suppressSortFetchRef = useRef(false);
  const lastReportsRestoreKeyRef = useRef<string | null>(null);

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

  useLayoutEffect(() => {
    const restore = (location.state as { reportsRestore?: ReportsRestoreState } | null)
      ?.reportsRestore;
    if (!restore || !queryContext) return;

    const restoreKey = `${reportTableKey}:${restore.page}:${restore.pageSize}:${restore.sort.join('|')}`;
    if (lastReportsRestoreKeyRef.current === restoreKey) return;
    lastReportsRestoreKeyRef.current = restoreKey;

    const { pagination, isGenerating } = reportGenerationStore.getState();
    if (isGenerating) return;

    pageSizeRef.current = restore.pageSize;
    changeTableState({ page: restore.page, pageSize: restore.pageSize });
    setPagination({ page: restore.page, pageSize: restore.pageSize });
    if (!reportSortParamsEqual(restore.sort, reportGenerationStore.getState().sort)) {
      setSort(restore.sort);
    }
    apiRef.current?.setPage?.(restore.page);
    apiRef.current?.setPaginationModel?.({ page: restore.page, pageSize: restore.pageSize });

    if (restore.page !== pagination.page || restore.pageSize !== pagination.pageSize) {
      void loadReportPage(restore.page, restore.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once per returnNavigation
  }, [location.state, queryContext, reportTableKey]);

  const rowIdOffset = storePagination.page * storePagination.pageSize;

  const columnAliases = useMemo(
    () => buildReportColumnAliasMap(queryContext?.body.selectedFields),
    [queryContext?.body.selectedFields],
  );

  const reportGroupBy = queryContext?.body.groupBy;

  const sortFieldByColumn = useMemo(() => {
    if (!queryContext?.body.selectedFields || !metadata?.entityName) {
      return new Map<string, string>();
    }
    return buildReportSortFieldMap(queryContext.body.selectedFields, reportGroupBy);
  }, [queryContext?.body.selectedFields, reportGroupBy, metadata?.entityName]);

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
      reportGroupBy,
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
    reportGroupBy,
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

    const nextSort = buildReportSortParams(tableState.sortModel, sortFieldByColumn, reportGroupBy);
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
    reportGroupBy,
    changeTableState,
    loadReportPage,
    setPagination,
    setSort,
    apiRef,
  ]);

  const totalElements = lastResult?.totalElements ?? 0;
  const showReportColumnHeaders = Boolean(queryContext && columns.length > 0);
  const isChartView = viewMode === 'chart';

  const chartFieldOptions = useMemo(() => {
    const labels = queryContext?.columnHeaderLabels ?? {};
    const keys = new Set<string>();
    for (const field of queryContext?.body.selectedFields ?? []) {
      if (field?.fieldName) keys.add(field.fieldName);
    }
    for (const field of queryContext?.body.groupBy ?? []) {
      if (field) keys.add(field);
    }
    for (const row of lastResult?.content ?? []) {
      Object.keys(row as Record<string, unknown>).forEach((key) => keys.add(key));
    }
    return Array.from(keys).map((value) => ({
      value,
      label: labels[value] || value,
    }));
  }, [queryContext, lastResult?.content]);

  const handleChartSpecChange = useCallback(
    (next: ReportChartSpec) => {
      setChartSpec(next);
      const ctx = reportGenerationStore.getState().queryContext;
      if (ctx) {
        reportGenerationStore.getState().setQueryContext({
          ...ctx,
          chartSpec: normalizeChartSpec(next),
        });
      }
    },
    [setChartSpec],
  );

  // Восстановление chartSpec при смене сформированного отчёта.
  useEffect(() => {
    if (!queryContext?.chartSpec) return;
    setChartSpec(queryContext.chartSpec);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при смене отчёта
  }, [reportTableKey, setChartSpec]);

  // Режим графика: первая порция 100 строк; дальше — appendChartPage по скроллу вправо.
  useEffect(() => {
    if (!isChartView || !queryContext) return;
    const total = lastResult?.totalElements ?? 0;
    const loaded = Array.isArray(lastResult?.content) ? lastResult.content.length : 0;
    if (total <= 0) return;
    if (loaded >= Math.min(total, CHART_REPORT_PAGE_SIZE)) return;
    if (isLoadingPage || isGenerating || isAppendingChart) return;
    void loadReportPage(0, CHART_REPORT_PAGE_SIZE);
  }, [
    isChartView,
    queryContext,
    lastResult?.totalElements,
    lastResult?.content,
    isLoadingPage,
    isGenerating,
    isAppendingChart,
    loadReportPage,
  ]);

  const chartRows = (lastResult?.content as Array<Record<string, unknown>>) ?? [];
  const chartHasMore = chartRows.length < totalElements;
  const handleChartReachEnd = useCallback(() => {
    void appendChartPage();
  }, [appendChartPage]);
  const [chartSettingsCollapsed, setChartSettingsCollapsed] = useState(false);

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
      className={`${styles.tableWrapper} ${showReportColumnHeaders && !isChartView ? styles.tableAreaWithReportHeaders : ''}`}>
      {isChartView ? (
        <div className={styles.chartsArea}>
          {(isLoadingPage || isGenerating) && chartRows.length === 0 ? (
            <Box className={styles.chartsLoading}>
              <CircularProgress size={48} />
              <Typography color="text.secondary">{t('reports.chartLoading')}</Typography>
            </Box>
          ) : (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1, flexShrink: 0 }}>
                {chartHasMore
                  ? t('reports.chartRowsHintPaged', {
                      defaultValue:
                        'Загружено {{count}} из {{total}}. Прокрутите график вправо для подгрузки следующих {{pageSize}}.',
                    })
                      .replace('{{count}}', String(chartRows.length))
                      .replace('{{total}}', String(totalElements))
                      .replace('{{pageSize}}', String(CHART_REPORT_PAGE_SIZE))
                  : t('reports.chartRowsHint', {
                      defaultValue: 'Строк в графике: {{count}}',
                    }).replace('{{count}}', String(chartRows.length))}
              </Typography>
              <div className={styles.chartsBody}>
                <div className={styles.chartsCanvasCol}>
                  <ReportChartCanvas
                    rows={chartRows}
                    spec={chartSpec}
                    groupBy={queryContext?.body.groupBy}
                    height="100%"
                    hasMore={chartHasMore}
                    loadingMore={isAppendingChart}
                    onReachEnd={handleChartReachEnd}
                  />
                </div>
                <div
                  className={`${styles.chartsSettingsCol} ${
                    chartSettingsCollapsed ? styles.chartsSettingsColCollapsed : ''
                  }`}>
                  <Tooltip
                    title={
                      chartSettingsCollapsed
                        ? t('reports.chartSettingsExpand', { defaultValue: 'Показать настройки' })
                        : t('reports.chartSettingsCollapse', { defaultValue: 'Скрыть настройки' })
                    }>
                    <IconButton
                      size="small"
                      className={styles.chartsSettingsToggle}
                      onClick={() => setChartSettingsCollapsed((prev) => !prev)}
                      aria-label={
                        chartSettingsCollapsed
                          ? t('reports.chartSettingsExpand', { defaultValue: 'Показать настройки' })
                          : t('reports.chartSettingsCollapse', { defaultValue: 'Скрыть настройки' })
                      }>
                      {chartSettingsCollapsed ? (
                        <ChevronLeftIcon fontSize="small" />
                      ) : (
                        <ChevronRightIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  {!chartSettingsCollapsed ? (
                    <div className={styles.chartsSettingsContent}>
                      <ReportChartSettingsPanel
                        spec={chartSpec}
                        fieldOptions={chartFieldOptions}
                        onChange={handleChartSpecChange}
                        disabled={isLoadingPage || isGenerating}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
