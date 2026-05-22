import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@mui/material';

import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { FilterButton } from '@shared/ui/table_filter_button';
import eventTableStyles from '@widgets/events_table/ui/EventsTable.module.scss';

import { ReportsDynamicFilters } from './ReportsDynamicFilters';

type ReportsMobileToolbarProps = {
  onFormReport: () => void;
  onResetFilters: () => void;
  isGenerating: boolean;
  canFormReport: boolean;
};

const modalSecondaryButtonSx = {
  flex: 1,
  textTransform: 'none' as const,
  fontWeight: 500,
  borderColor: 'divider',
  color: 'text.secondary',
};

export function ReportsMobileToolbar({
  onFormReport,
  onResetFilters,
  isGenerating,
  canFormReport,
}: ReportsMobileToolbarProps) {
  const { t } = useTranslation();
  const styles = eventTableStyles;
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  return (
    <>
      <div className={styles.mobileFilters}>
        <FilterButton
          active={false}
          open={isFilterModalOpen}
          toggle={() => setIsFilterModalOpen((v) => !v)}
          testid="reports-filter-button"
        />
        <ResetFilters reset={onResetFilters} />
        <Button
          variant="contained"
          size="small"
          disabled={isGenerating || !canFormReport}
          onClick={onFormReport}
          sx={{ ml: 'auto', textTransform: 'none' }}>
          {t('reports.formReport')}
        </Button>
      </div>

      {isFilterModalOpen ? (
        <div className={styles.filterModalOverlay} onClick={() => setIsFilterModalOpen(false)}>
          <div
            className={styles.filterModalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="reports-filters-modal-title">
            <div className={styles.filterModalHeader}>
              <h3 id="reports-filters-modal-title">{t('common.filters')}</h3>
            </div>
            <div className={styles.filterModalBody}>
              <ReportsDynamicFilters layout="stacked" />
            </div>
            <div className={styles.filterModalFooter}>
              <Button
                variant="outlined"
                sx={modalSecondaryButtonSx}
                onClick={() => setIsFilterModalOpen(false)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
