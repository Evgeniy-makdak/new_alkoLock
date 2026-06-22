import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Button as MuiButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import { PageWrapper } from '@layout/page_wrapper';
import type { ReportExportFormat } from '@pages/reports/api/reportsApi';
import { resetReportsTablePaginationStorage } from '@pages/reports/lib/resetReportsTablePaginationStorage';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { getToolbarSecondaryButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
import { Button, ButtonsType } from '@shared/ui/button';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import styles from './Reports.module.scss';
import { ReportComposeModal, type ReportComposeModalMode } from './ReportComposeModal';
import { ReportGeneratingOverlay } from './ReportGeneratingOverlay';
import { ReportSaveFileDialog } from './ReportSaveFileDialog';
import { ReportsResultsView } from './ReportsResultsView';
import { ReportsViewModeSelect } from './ReportsViewModeSelect';

export function ReportsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const createReportButtonSx = useMemo(() => getToolbarSecondaryButtonSx(theme), [theme]);
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);

  const loadEntities = reportsStore((s) => s.loadEntities);
  const resetFilters = reportsStore((s) => s.resetFilters);
  const setSelectedEntityName = reportsStore((s) => s.setSelectedEntityName);

  const isGenerating = reportGenerationStore((s) => s.isGenerating);
  const isExporting = reportGenerationStore((s) => s.isExporting);
  const queryContext = reportGenerationStore((s) => s.queryContext);
  const lastResult = reportGenerationStore((s) => s.lastResult);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeModalMode, setComposeModalMode] = useState<ReportComposeModalMode>('create');
  const [saveFileDialogOpen, setSaveFileDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ReportExportFormat>('CSV');

  const hasDisplayableReport = !!queryContext && !!lastResult;
  const canSaveReportToFile = hasDisplayableReport && !isGenerating && !isExporting;

  const handleSaveReportToFile = useCallback(() => {
    if (!canSaveReportToFile) return;
    setSaveFileDialogOpen(true);
  }, [canSaveReportToFile]);

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
              {!isMobile ? (
                <div className={styles.headerActions}>
                  <TableHeaderEndToolbar>
                    <div className={styles.headerExportControls}>{renderExportControls()}</div>
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
                  </TableHeaderEndToolbar>
                </div>
              ) : null}
            </div>
          </div>

          {isMobile ? (
            <div className={styles.mobileCreateBar}>
              <div className={styles.mobileExportControls}>{renderExportControls()}</div>
              <div className={styles.mobileCreateActions}>
                {hasDisplayableReport ? (
                  <MuiButton
                    variant="contained"
                    size="small"
                    startIcon={<EditOutlinedIcon />}
                    disabled={isGenerating}
                    onClick={openComposeModalForEdit}
                    className={styles.mobileCreateButton}
                    sx={[createReportButtonSx, { textTransform: 'none', minWidth: 0 }]}>
                    {t('reports.editReport')}
                  </MuiButton>
                ) : null}
                <MuiButton
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  disabled={isGenerating}
                  onClick={openComposeModalForCreate}
                  className={styles.mobileCreateButton}
                  sx={[createReportButtonSx, { textTransform: 'none', minWidth: 0 }]}>
                  {t('reports.createNewReport')}
                </MuiButton>
                <ResetFilters reset={handleResetFilters} />
              </div>
            </div>
          ) : null}

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
        </div>
      </PageWrapper>

      <ReportComposeModal
        open={composeModalOpen}
        mode={composeModalMode}
        onClose={() => setComposeModalOpen(false)}
      />

      <ReportSaveFileDialog
        open={saveFileDialogOpen}
        exportFormat={exportFormat}
        onClose={() => setSaveFileDialogOpen(false)}
      />
    </>
  );
}
