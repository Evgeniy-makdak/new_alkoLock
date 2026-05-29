import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import { Button, Typography, useMediaQuery } from '@mui/material';

import { PageWrapper } from '@layout/page_wrapper';
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
    setSelectedEntityName(null);
    resetFilters();
    setComposeModalOpen(true);
  }, [setSelectedEntityName, resetFilters]);

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
      />
    </>
  );
}
