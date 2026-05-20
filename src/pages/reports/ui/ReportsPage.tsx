import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import BarChartIcon from '@mui/icons-material/BarChart';
import { Button, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { PageWrapper } from '@layout/page_wrapper';
import { executeReportQuery } from '@pages/reports/api/reportsApi';
import { buildReportQueryRequest } from '@pages/reports/lib/buildReportQueryRequest';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import styles from './Reports.module.scss';
import { ReportsDynamicFilters } from './ReportsDynamicFilters';
import { ReportsMobileToolbar } from './ReportsMobileToolbar';
import { ReportsResultsView } from './ReportsResultsView';

export function ReportsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);

  const loadEntities = reportsStore((s) => s.loadEntities);
  const selectedEntityName = reportsStore((s) => s.selectedEntityName);
  const metadata = reportsStore((s) => s.metadata);
  const selectedOutputFields = reportsStore((s) => s.selectedOutputFields);
  const filterSelections = reportsStore((s) => s.filterSelections);
  const nestedEntityFilterByField = reportsStore((s) => s.nestedEntityFilterByField);
  const resetFilters = reportsStore((s) => s.resetFilters);
  const setSelectedEntityName = reportsStore((s) => s.setSelectedEntityName);

  const isGenerating = reportGenerationStore((s) => s.isGenerating);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  const executeReportLoad = useCallback(async () => {
    if (!selectedEntityName || !metadata) {
      reportGenerationStore.getState().completeError(t('reports.selectEntityFirst'));
      return;
    }
    if (!selectedOutputFields.length) {
      reportGenerationStore.getState().completeError(t('reports.selectOutputFieldsFirst'));
      return;
    }

    const { pagination, sort, setQueryContext, setPagination } = reportGenerationStore.getState();
    reportGenerationStore.getState().start();
    setPagination({ page: 0 });

    try {
      const body = buildReportQueryRequest({
        metadata,
        selectedFieldKeys: selectedOutputFields,
        filterSelections,
        nestedEntityFilterByField,
      });

      setQueryContext({ entityName: selectedEntityName, body });

      const result = await executeReportQuery(selectedEntityName, body, {
        page: 0,
        size: pagination.pageSize,
        sort,
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
  }, [
    selectedEntityName,
    metadata,
    selectedOutputFields,
    filterSelections,
    nestedEntityFilterByField,
    t,
  ]);

  const beginReportGeneration = useCallback(async () => {
    if (reportGenerationStore.getState().isGenerating) return;
    if (!selectedEntityName || !metadata) {
      reportGenerationStore.getState().completeError(t('reports.selectEntityFirst'));
      return;
    }
    if (!selectedOutputFields.length) {
      reportGenerationStore.getState().completeError(t('reports.selectOutputFieldsFirst'));
      return;
    }

    reportGenerationStore.getState().prepareNewReportView();
    await executeReportLoad();
  }, [selectedEntityName, metadata, selectedOutputFields, executeReportLoad, t]);

  const handleResetFilters = () => {
    resetFilters();
    setSelectedEntityName(null);
    reportGenerationStore.getState().clearResults();
  };

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
                    disabled={isGenerating || !metadata}
                    onClick={() => void beginReportGeneration()}
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
                    {t('reports.createReport')}
                  </Button>
                  <ResetFilters reset={handleResetFilters} />
                </TableHeaderEndToolbar>
              </div>
            ) : null}
          </div>

          {isCompactHeader ? (
            <ReportsMobileToolbar
              onCreateReport={() => void beginReportGeneration()}
              onResetFilters={handleResetFilters}
              isGenerating={isGenerating}
            />
          ) : (
            <div className={styles.filtersBar}>
              <ReportsDynamicFilters />
            </div>
          )}

          <div className={styles.tableArea}>
            <ReportsResultsView />
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
