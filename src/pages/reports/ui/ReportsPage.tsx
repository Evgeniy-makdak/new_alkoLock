import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BarChartIcon from '@mui/icons-material/BarChart';
import { Button, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { PageWrapper } from '@layout/page_wrapper';
import { executeReportQuery } from '@pages/reports/api/reportsApi';
import {
  hasReportTableFieldsMetadataDefaults,
  mergeAllReportTableFieldOptions,
} from '@pages/reports/lib/buildReportTableFieldOptions';
import { buildReportQueryRequest } from '@pages/reports/lib/buildReportQueryRequest';
import { isReportOutputRowComplete } from '@pages/reports/lib/reportOutputRow';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { getPrimaryReportOutputRow, reportsStore } from '@pages/reports/model/reportsStore';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import type { Values } from '@shared/ui/search_multiple_select';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import styles from './Reports.module.scss';
import { ReportTableFieldsDialog } from './ReportTableFieldsDialog';
import { ReportsDynamicFilters } from './ReportsDynamicFilters';
import { ReportsMobileToolbar } from './ReportsMobileToolbar';
import { ReportGeneratingOverlay } from './ReportGeneratingOverlay';
import { ReportsResultsView } from './ReportsResultsView';

export function ReportsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);

  const loadEntities = reportsStore((s) => s.loadEntities);
  const selectedEntityName = reportsStore((s) => s.selectedEntityName);
  const metadata = reportsStore((s) => s.metadata);
  const outputRows = reportsStore((s) => s.outputRows);
  const logicOperator = reportsStore((s) => s.logicOperator);
  const resetFilters = reportsStore((s) => s.resetFilters);
  const setSelectedEntityName = reportsStore((s) => s.setSelectedEntityName);
  const reportTableFieldsMetadataByRowId = reportsStore(
    (s) => s.reportTableFieldsMetadataByRowId,
  );

  const isGenerating = reportGenerationStore((s) => s.isGenerating);

  const [tableFieldsDialogOpen, setTableFieldsDialogOpen] = useState(false);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  const tableFieldsInitialSelection = useMemo((): Values => {
    const primaryRow = getPrimaryReportOutputRow();
    return primaryRow.reportTableFields.length > 0 ? primaryRow.reportTableFields : [];
  }, [outputRows]);

  const tableFieldsDialogOptions = useMemo((): Values => {
    if (!metadata) return [];
    const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
    const activeRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
    return mergeAllReportTableFieldOptions(
      metadata,
      activeRows,
      fieldMap,
      reportTableFieldsMetadataByRowId,
    );
  }, [metadata, outputRows, reportTableFieldsMetadataByRowId]);

  const executeReportLoad = useCallback(async () => {
    const {
      selectedEntityName: entityName,
      metadata: entityMetadata,
      outputRows: currentOutputRows,
      logicOperator: currentLogicOperator,
      reportTableFieldsMetadataByRowId: tableMetadataByRowId,
    } = reportsStore.getState();

    if (!entityName || !entityMetadata) {
      reportGenerationStore.getState().completeError(t('reports.selectEntityFirst'));
      return;
    }
    const fieldMap = new Map(entityMetadata.fields.map((f) => [f.fieldName, f]));
    const primaryRow = getPrimaryReportOutputRow();
    const readyRow = currentOutputRows.find((row) =>
      isReportOutputRowComplete(row, fieldMap, tableMetadataByRowId[row.id] ?? null, entityMetadata),
    );
    if (!readyRow) {
      reportGenerationStore.getState().completeError(t('reports.selectReportTableFieldsFirst'));
      return;
    }

    if (!primaryRow.reportTableFields.length) {
      reportGenerationStore.getState().completeError(t('reports.selectReportTableFieldsFirst'));
      return;
    }

    const { pagination, setQueryContext, setPagination, setSort } = reportGenerationStore.getState();
    reportGenerationStore.getState().start();
    setPagination({ page: 0 });
    setSort([]);

    try {
      const body = buildReportQueryRequest({
        metadata: entityMetadata,
        outputRows: currentOutputRows,
        logicOperator: currentLogicOperator,
        reportTableFieldsMetadataByRowId: tableMetadataByRowId,
      });

      setQueryContext({ entityName, body });

      const result = await executeReportQuery(entityName, body, {
        page: 0,
        size: pagination.pageSize,
        sort: [],
      });
      reportGenerationStore.getState().completeSuccess(result);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        reportGenerationStore.getState().finishCancelled();
        return;
      }
      reportGenerationStore
        .getState()
        .completeError(e instanceof Error ? e.message : t('reports.loadError'));
    }
  }, [t]);

  const loadReportTableFieldsMetadata = reportsStore((s) => s.loadReportTableFieldsMetadata);

  const openFormReportDialog = useCallback(async () => {
    if (reportGenerationStore.getState().isGenerating) return;
    if (!selectedEntityName || !metadata) {
      reportGenerationStore.getState().completeError(t('reports.selectEntityFirst'));
      return;
    }
    const activeRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
    if (!activeRows.length) {
      reportGenerationStore.getState().completeError(t('reports.selectOutputFieldsFirst'));
      return;
    }

    const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
    const tableMetadataByRowId = reportsStore.getState().reportTableFieldsMetadataByRowId;
    const canForm = outputRows.some((row) =>
      isReportOutputRowComplete(row, fieldMap, tableMetadataByRowId[row.id] ?? null, metadata),
    );
    if (!canForm) {
      reportGenerationStore.getState().completeError(t('reports.selectReportTableFieldsFirst'));
      return;
    }

    for (const row of activeRows) {
      const key = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
      const ref = fieldMap.get(key)?.referenceEntity?.trim();
      if (ref) {
        await loadReportTableFieldsMetadata(row.id, ref);
      }
    }

    const options = mergeAllReportTableFieldOptions(
      metadata,
      activeRows,
      fieldMap,
      reportsStore.getState().reportTableFieldsMetadataByRowId,
    );
    if (!options.length) {
      reportGenerationStore.getState().completeError(t('reports.tableFieldsDialogEmpty'));
      return;
    }

    setTableFieldsDialogOpen(true);
  }, [selectedEntityName, metadata, outputRows, loadReportTableFieldsMetadata, t]);

  const handleConfirmTableFields = useCallback(
    (selected: Values) => {
      const { outputRows: currentRows, setOutputRowReportTableFields: setTableFields } =
        reportsStore.getState();
      for (const row of currentRows) {
        if (row.selectedOutputFields.length > 0) {
          setTableFields(row.id, selected);
        }
      }
      reportGenerationStore.getState().prepareNewReportView();
      void executeReportLoad();
    },
    [executeReportLoad],
  );

  const handleResetFilters = () => {
    resetFilters();
    setSelectedEntityName(null);
    reportGenerationStore.getState().clearResults();
  };

  const canFormReport = useMemo(() => {
    if (!metadata) return false;
    const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
    const activeRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
    const hasReadyRow = activeRows.some((row) =>
      isReportOutputRowComplete(row, fieldMap, reportTableFieldsMetadataByRowId[row.id] ?? null, metadata),
    );
    if (!hasReadyRow || !activeRows.length) return false;

    return hasReportTableFieldsMetadataDefaults(
      metadata,
      activeRows,
      fieldMap,
      reportTableFieldsMetadataByRowId,
    );
  }, [metadata, outputRows, reportTableFieldsMetadataByRowId]);

  const isCompactHeader = isMobile || isTablet;

  return (
    <>
      {isMobile || isTablet ? <div style={{ height: '50px' }} /> : null}
      <PageWrapper>
        <div className={styles.wrapper}>
          <div
            className={styles.pageHeader}
            style={{
              backgroundColor:
                theme.palette.mode === 'dark' ? theme.palette.background.default : '#f5f5f5',
            }}>
            <Typography component="h1" className={styles.title} sx={{ color: 'text.primary' }}>
              {isCompactHeader ? t('nav.reports') : t('reports.pageTitle')}
            </Typography>
            {!isCompactHeader ? (
              <div className={styles.headerActions}>
                <TableHeaderEndToolbar>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<BarChartIcon />}
                    disabled={isGenerating || !canFormReport}
                    onClick={openFormReportDialog}
                    sx={{
                      textTransform: 'capitalize',
                      fontWeight: 500,
                      fontSize: '14px',
                      letterSpacing: '0.1px',
                      borderRadius: '10px',
                      height: '30px',
                      minWidth: '112px',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      borderColor:
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.16)' : '#e0e0e0',
                      color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.87)' : '#333333',
                    }}>
                    {t('reports.formReport')}
                  </Button>
                  <ResetFilters reset={handleResetFilters} />
                </TableHeaderEndToolbar>
              </div>
            ) : null}
          </div>

          {isMobile ? (
            <ReportsMobileToolbar
              onFormReport={openFormReportDialog}
              onResetFilters={handleResetFilters}
              isGenerating={isGenerating}
              canFormReport={canFormReport}
            />
          ) : (
            <div className={styles.filtersBar}>
              <ReportsDynamicFilters layout={isTablet ? 'stacked' : 'default'} />
            </div>
          )}

          <div
            className={`${styles.tableArea} ${isGenerating ? styles.tableAreaGenerating : ''}`}>
            {isGenerating ? <ReportGeneratingOverlay /> : null}
            <ReportsResultsView />
          </div>
        </div>
      </PageWrapper>

      <ReportTableFieldsDialog
        open={tableFieldsDialogOpen}
        options={tableFieldsDialogOptions}
        initialSelection={tableFieldsInitialSelection}
        onClose={() => setTableFieldsDialogOpen(false)}
        onConfirm={handleConfirmTableFields}
      />
    </>
  );
}
