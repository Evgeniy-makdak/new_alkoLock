import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
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
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import styles from './Reports.module.scss';
import { ReportComposeModal } from './ReportComposeModal';
import { ReportGeneratingOverlay } from './ReportGeneratingOverlay';
import { ReportsResultsView } from './ReportsResultsView';

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
  const exportDisplayedReport = reportGenerationStore((s) => s.exportDisplayedReport);

  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [exportEnabled, setExportEnabled] = useState(false);
  const [exportFormat, setExportFormat] = useState<ReportExportFormat>('CSV');

  const handleExportEnabledChange = useCallback(
    (checked: boolean) => {
      setExportEnabled(checked);
      if (!checked || isGenerating || isExporting) return;
      const { queryContext: ctx, lastResult: result } = reportGenerationStore.getState();
      if (!ctx || !result) return;
      void exportDisplayedReport(exportFormat);
    },
    [exportFormat, exportDisplayedReport, isGenerating, isExporting],
  );

  const renderExportControls = () => (
    <>
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={exportEnabled}
            disabled={isGenerating || isExporting}
            onChange={(_, checked) => handleExportEnabledChange(checked)}
          />
        }
        label={
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {t('reports.saveAsFile')}
          </Typography>
        }
        sx={{ mr: 0 }}
      />
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

  const openComposeModal = useCallback(() => {
    if (reportGenerationStore.getState().isGenerating) return;
    // Не сбрасываем reportsStore: таблица результатов читает metadata/кэши для заголовков.
    // Снимок и откат при отмене — в ReportComposeModal.
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
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      disabled={isGenerating}
                      onClick={openComposeModal}
                      sx={createReportButtonSx}>
                      {t('reports.createNewReport')}
                    </Button>
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
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  disabled={isGenerating}
                  onClick={openComposeModal}
                  className={styles.mobileCreateButton}
                  sx={[createReportButtonSx, { textTransform: 'none', minWidth: 0 }]}>
                  {t('reports.createNewReport')}
                </Button>
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
        onClose={() => setComposeModalOpen(false)}
        exportEnabled={exportEnabled}
        exportFormat={exportFormat}
      />
    </>
  );
}
