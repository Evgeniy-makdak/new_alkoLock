import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import SortOutlinedIcon from '@mui/icons-material/SortOutlined';
import { IconButton, Tooltip, Typography } from '@mui/material';
import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';
import { useTheme } from '@mui/material/styles';

import { getToolbarCircleIconButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
import type { ReportComposeSortRow } from '@pages/reports/types/reportComposeSort';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportAddSortDialog } from './ReportAddSortDialog';
import composeStyles from './ReportComposeModal.module.scss';
import { ReportComposeSection } from './ReportComposeSection';
import pageStyles from './Reports.module.scss';

type ReportComposeSortSectionProps = {
  columnOptions: Values;
  sortRows: ReportComposeSortRow[];
  onChange: (rows: ReportComposeSortRow[]) => void;
};

function directionLabel(
  direction: ReportComposeSortRow['direction'],
  t: (key: string) => string,
): string {
  return direction === 'DESC'
    ? t('reports.composeSortDirectionDesc')
    : t('reports.composeSortDirectionAsc');
}

export function ReportComposeSortSection({
  columnOptions,
  sortRows,
  onChange,
}: ReportComposeSortSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const circleIconSx = getToolbarCircleIconButtonSx(theme);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const columnLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of columnOptions) {
      map.set(String(option.value), String(option.label ?? option.value));
    }
    return map;
  }, [columnOptions]);

  const handleConfirmAdd = (columnKey: string, direction: ReportComposeSortRow['direction']) => {
    onChange([
      ...sortRows,
      {
        id: `report-sort-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        columnKey,
        direction,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    onChange(sortRows.filter((row) => row.id !== id));
  };

  const canAddSort = columnOptions.length > 0;

  return (
    <>
      <ReportComposeSection
        icon={SortOutlinedIcon}
        iconTone="blue"
        title={t('reports.composeSectionSort')}
        action={
          <button
            type="button"
            className={composeStyles.addGroupLink}
            disabled={!canAddSort}
            onClick={() => setAddDialogOpen(true)}>
            {t('reports.composeAddSort')}
          </button>
        }>
        <div className={composeStyles.sortSectionBody}>
          {sortRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('reports.composeSortColumnPlaceholder')}
            </Typography>
          ) : (
            sortRows.map((row) => {
              const columnLabel = columnLabelByKey.get(row.columnKey) ?? row.columnKey;
              return (
                <div key={row.id} className={composeStyles.sortRow}>
                  <div className={composeStyles.sortRowFields}>
                    <OverflowTooltip title={columnLabel}>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {columnLabel}
                      </Typography>
                    </OverflowTooltip>
                    <span className={composeStyles.sortRowDash}>—</span>
                    <Typography variant="body2" component="span" color="text.secondary">
                      {directionLabel(row.direction, t)}
                    </Typography>
                  </div>
                  <Tooltip title={t('reports.composeRemoveSort')}>
                    <IconButton
                      type="button"
                      aria-label={t('reports.composeRemoveSort')}
                      className={`${composeStyles.sortRowRemoveBtn} ${pageStyles.reportFilterCircleBtn}`}
                      onClick={() => handleRemove(row.id)}
                      sx={circleIconSx}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              );
            })
          )}
        </div>
      </ReportComposeSection>

      <ReportAddSortDialog
        open={addDialogOpen}
        columnOptions={columnOptions}
        onClose={() => setAddDialogOpen(false)}
        onConfirm={handleConfirmAdd}
      />
    </>
  );
}
