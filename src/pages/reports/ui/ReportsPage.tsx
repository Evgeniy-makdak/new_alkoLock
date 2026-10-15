import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Button as MuiButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import { PageWrapper } from '@layout/page_wrapper';
import type { ReportExportFormat } from '@pages/reports/api/reportsApi';
import { dashboardStore } from '@pages/reports/dashboard/model/dashboardStore';
import { ReportsDashboardsPanel } from '@pages/reports/dashboard/ui/ReportsDashboardsPanel';
import { resetReportsTablePaginationStorage } from '@pages/reports/lib/resetReportsTablePaginationStorage';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { createDefaultChartSpec } from '@pages/reports/types/chartSpec';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { getToolbarSecondaryButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
import { Button, ButtonsType } from '@shared/ui/button';
import { Refetch } from '@shared/ui/refetch/Refetch';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import styles from './Reports.module.scss';
import { ReportAiComposeDialog } from './ReportAiComposeDialog';
import { ReportComposeModal, type ReportComposeModalMode } from './ReportComposeModal';
import { ReportGeneratingOverlay } from './ReportGeneratingOverlay';
import { ReportSaveFileDialog } from './ReportSaveFileDialog';
import { ReportsResultsView } from './ReportsResultsView';
import { ReportsViewModeSelect } from './ReportsViewModeSelect';

/** AI-отчёт по описанию (NL → черновик → отрисовка). */
const SHOW_REPORT_AI_COMPOSE_UI = true;

export function ReportsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const createReportButtonSx = useMemo(() => getToolbarSecondaryButtonSx(theme), [theme]);
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);

  const workspaceTab = dashboardStore((s) => s.workspaceTab);
  const setWorkspaceTab = dashboardStore((s) => s.setWorkspaceTab);
  const isDashboardsTab = workspaceTab === 'dashboards';

  const loadEntities = reportsStore((s) => s.loadEntities);
  const resetFilters = reportsStore((s) => s.resetFilters);
  const setSelectedEntityName = reportsStore((s) => s.setSelectedEntityName);

  const isGenerating = reportGenerationStore((s) => s.isGenerating);
  const isExporting = reportGenerationStore((s) => s.isExporting);
  const queryContext = reportGenerationStore((s) => s.queryContext);
  const lastResult = reportGenerationStore((s) => s.lastResult);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeModalMode, setComposeModalMode] = useState<ReportComposeModalMode>('create');
  const [aiComposeOpen, setAiComposeOpen] = useState(false);
  const [saveFileDialogOpen, setSaveFileDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ReportExportFormat>('CSV');

  const hasDisplayableReport = !!queryContext && !!lastResult;
  const canSaveReportToFile = hasDisplayableReport && !isGenerating && !isExporting;
  const canRefreshReport = hasDisplayableReport && !isGenerating && !isExporting;

  const handleSaveReportToFile = useCallback(() => {
    if (!canSaveReportToFile) return;
    setSaveFileDialogOpen(true);
  }, [canSaveReportToFile]);

  const handleRefreshReport = useCallback(() => {
    if (!canRefreshReport || !queryContext) return;
    const { pagination } = reportGenerationStore.getState();
    reportGenerationStore.getState().loadReportPage(0, pagination.pageSize);
  }, [canRefreshReport, queryContext]);

  const renderExportControls = () => (
    <>
      {hasDisplayableReport ? (
        <ReportsViewModeSelect disabled={isGenerating || isExporting} />
      ) : null}
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel id="report-export-format-label">{t('reports.format')}</InputLabel>
        <Select
          labelId="report-export-format-label"
          value={exportFormat}
          label={t('reports.format')}
          disabled={isGenerating || isExporting}
          onChange={(e) => setExportFormat(e.target.value as ReportExportFormat)}>
          <MenuItem value="CSV">CSV</MenuItem>
          <MenuItem value="XLS">XLS</MenuItem>
          <MenuItem value="PDF">PDF</MenuItem>
        </Select>
      </FormControl>
      <Button
        typeButton={ButtonsType.action}
        disabled={!canSaveReportToFile}
        onClick={handleSaveReportToFile}>
        {t('common.save')}
      </Button>
    </>
  );

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  const handleResetFilters = () => {
    const { pagination } = reportGenerationStore.getState();
    resetReportsTablePaginationStorage(pagination.pageSize);
    resetFilters();
    setSelectedEntityName(null);
    reportGenerationStore.getState().clearResults();
    // Сбросить и режим графиков: иначе после очистки результатов остаётся
    // chartsArea с боковой панелью настроек графика от прежнего отчёта.
    reportsStore.getState().setViewMode('table');
    reportsStore.getState().setChartSpec(createDefaultChartSpec());
  };

  const openComposeModalForCreate = useCallback(() => {
    if (reportGenerationStore.getState().isGenerating) return;
    setComposeModalMode('create');
    setComposeModalOpen(true);
  }, []);

  const openComposeModalForEdit = useCallback(() => {
    if (reportGenerationStore.getState().isGenerating) return;
    if (!reportGenerationStore.getState().queryContext) return;
    setComposeModalMode('edit');
    setComposeModalOpen(true);
  }, []);

  const openAiComposeDialog = useCallback(() => {
    if (reportGenerationStore.getState().isGenerating) return;
    setAiComposeOpen(true);
  }, []);

  const handleAiOpenEditor = useCallback(() => {
    setComposeModalMode('edit');
    setComposeModalOpen(true);
  }, []);

  const isCompactHeader = isMobile || isTablet;

  return (
    <>
      {isMobile || isTablet ? <div style={{ height: '50px' }} /> : null}
      <PageWrapper>
        <div className={styles.wrapper}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderBar}>
              <Typography component="h1" className={styles.title} sx={{ color: 'text.primary' }}>
                {isCompactHeader ? t('nav.reports') : t('reports.pageTitle')}
              </Typography>
              {!isMobile && !isDashboardsTab ? (
                <div className={styles.headerActions}>
                  <TableHeaderEndToolbar />
                </div>
              ) : null}
            </div>
            <Tabs
              value={workspaceTab}
              onChange={(_, value) => setWorkspaceTab(value)}
              sx={{ px: 2, minHeight: 40 }}
              variant={isMobile ? 'fullWidth' : 'standard'}>
              <Tab
                value="reports"
                label={t('reports.dashboard.tabReports', 'Отчёты')}
                sx={{ textTransform: 'none', minHeight: 40 }}
              />
              <Tab
                value="dashboards"
                label={t('reports.dashboard.tabDashboards', 'Дашборды')}
                sx={{ textTransform: 'none', minHeight: 40 }}
              />
            </Tabs>
          </div>

          {isDashboardsTab ? (
            <div
              className={styles.tableArea}
              style={{ padding: '8px 16px 16px', overflow: 'auto' }}>
              <ReportsDashboardsPanel />
            </div>
          ) : (
            <>
              <div
                className={styles.reportToolbar}
                style={{
                  padding: '8px var(--table-page-content-inset-inline, 16px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  flexWrap: 'wrap',
                  flexShrink: 0,
                }}>
                {renderExportControls()}
                {hasDisplayableReport ? (
                  <MuiButton
                    variant="contained"
                    size="small"
                    startIcon={<EditOutlinedIcon />}
                    disabled={isGenerating}
                    onClick={openComposeModalForEdit}
                    sx={createReportButtonSx}>
                    {t('reports.editReport')}
                  </MuiButton>
                ) : null}
                {SHOW_REPORT_AI_COMPOSE_UI ? (
                  <MuiButton
                    variant="contained"
                    size="small"
                    startIcon={<AutoAwesomeOutlinedIcon />}
                    disabled={isGenerating}
                    onClick={openAiComposeDialog}
                    sx={createReportButtonSx}>
                    {t('reports.aiComposeOpen')}
                  </MuiButton>
                ) : null}
                <MuiButton
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  disabled={isGenerating}
                  onClick={openComposeModalForCreate}
                  sx={createReportButtonSx}>
                  {t('reports.createNewReport')}
                </MuiButton>
                <ResetFilters reset={handleResetFilters} />
                <Refetch
                  onClick={handleRefreshReport}
                  disabled={!canRefreshReport}
                />
              </div>

              <div
                className={[
                  styles.tableArea,
                  isGenerating ? styles.tableAreaGenerating : '',
                ]
                  .filter(Boolean)
                  .join(' ')}>
                {isGenerating ? <ReportGeneratingOverlay /> : null}
                <ReportsResultsView />
              </div>
            </>
          )}
        </div>
      </PageWrapper>

      <ReportComposeModal
        open={composeModalOpen}
        mode={composeModalMode}
        onClose={() => setComposeModalOpen(false)}
      />

      {SHOW_REPORT_AI_COMPOSE_UI ? (
        <ReportAiComposeDialog
          open={aiComposeOpen}
          onClose={() => setAiComposeOpen(false)}
          onOpenEditor={handleAiOpenEditor}
        />
      ) : null}

      <ReportSaveFileDialog
        open={saveFileDialogOpen}
        exportFormat={exportFormat}
        onClose={() => setSaveFileDialogOpen(false)}
      />
    </>
  );
}
