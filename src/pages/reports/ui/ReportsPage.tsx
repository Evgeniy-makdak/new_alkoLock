import { useCallback, useEffect, useState } from 'react';
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
} from '@mui/material';

import { PageWrapper } from '@layout/page_wrapper';
import type { ReportExportFormat } from '@pages/reports/api/reportsApi';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import styles from './Reports.module.scss';
import { ReportComposeModal } from './ReportComposeModal';
import { ReportGeneratingOverlay } from './ReportGeneratingOverlay';
import { ReportsResultsView } from './ReportsResultsView';

export function ReportsPage() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);

  const loadEntities = reportsStore((s) => s.loadEntities);
  const resetFilters = reportsStore((s) => s.resetFilters);
  const setSelectedEntityName = reportsStore((s) => s.setSelectedEntityName);

  const isGenerating = reportGenerationStore((s) => s.isGenerating);

  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [exportEnabled, setExportEnabled] = useState(false);
  const [exportFormat, setExportFormat] = useState<ReportExportFormat>('CSV');

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  const handleResetFilters = () => {
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
                    <div className={styles.headerExportControls}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={exportEnabled}
                            onChange={(_, checked) => setExportEnabled(checked)}
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
                        <InputLabel id="report-export-format-header-label">{t('reports.format')}</InputLabel>
                        <Select
                          labelId="report-export-format-header-label"
                          value={exportFormat}
                          label={t('reports.format')}
                          onChange={(e) => setExportFormat(e.target.value as ReportExportFormat)}>
                          <MenuItem value="CSV">CSV</MenuItem>
                          <MenuItem value="XLS">XLS</MenuItem>
                          <MenuItem value="PDF">PDF</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      disabled={isGenerating}
                      onClick={openComposeModal}
                      sx={{
                        textTransform: 'capitalize',
                        fontWeight: 500,
                        fontSize: '14px',
                        letterSpacing: '0.1px',
                        borderRadius: '10px',
                        height: '30px',
                        minWidth: '160px',
                      }}>
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
              <div className={styles.mobileExportControls}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={exportEnabled}
                      onChange={(_, checked) => setExportEnabled(checked)}
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
                  <InputLabel id="report-export-format-mobile-label">{t('reports.format')}</InputLabel>
                  <Select
                    labelId="report-export-format-mobile-label"
                    value={exportFormat}
                    label={t('reports.format')}
                    onChange={(e) => setExportFormat(e.target.value as ReportExportFormat)}>
                    <MenuItem value="CSV">CSV</MenuItem>
                    <MenuItem value="XLS">XLS</MenuItem>
                    <MenuItem value="PDF">PDF</MenuItem>
                  </Select>
                </FormControl>
              </div>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                fullWidth
                disabled={isGenerating}
                onClick={openComposeModal}
                sx={{ textTransform: 'none', mb: 1 }}>
                {t('reports.createNewReport')}
              </Button>
              <ResetFilters reset={handleResetFilters} />
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
