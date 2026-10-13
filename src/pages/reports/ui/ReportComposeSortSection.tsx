import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import SortOutlinedIcon from '@mui/icons-material/SortOutlined';
import { IconButton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  reportFilterAutocompleteSlotProps,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import { getToolbarCircleIconButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
import type {
  ReportComposeSortRow,
  ReportSortDirection,
} from '@pages/reports/types/reportComposeSort';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportAddSortDialog } from './ReportAddSortDialog';
import composeStyles from './ReportComposeModal.module.scss';
import { ReportComposeSection } from './ReportComposeSection';
import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';
import pageStyles from './Reports.module.scss';

type ReportComposeSortSectionProps = {
  columnOptions: Values;
  sortRows: ReportComposeSortRow[];
  onChange: (rows: ReportComposeSortRow[]) => void;
};

function pickSingle(options: Values, key: string): Values {
  if (!key) return [];
  const hit = options.find((option) => String(option.value) === key);
  return hit ? [hit] : [{ value: key, label: key }];
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

  const directionOptions = useMemo(
    (): Values => [
      { value: 'ASC', label: t('reports.composeSortDirectionAsc') },
      { value: 'DESC', label: t('reports.composeSortDirectionDesc') },
    ],
    [t],
  );

  const patchRow = (id: string, patch: Partial<ReportComposeSortRow>) => {
    onChange(sortRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleConfirmAdd = (columnKey: string, direction: ReportSortDirection) => {
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
            <div className={composeStyles.filterGroups}>
              {sortRows.map((row, index) => {
                const columnValue = pickSingle(columnOptions, row.columnKey);
                const columnChoices = [
                  ...columnValue,
                  ...columnOptions.filter((option) => String(option.value) !== row.columnKey),
                ];
                const uniqueColumnChoices = Array.from(
                  new Map(columnChoices.map((item) => [String(item.value), item])).values(),
                );
                const directionValue = pickSingle(directionOptions, row.direction);
                const hasColumn = Boolean(row.columnKey.trim());

                return (
                  <div key={row.id} className={composeStyles.filterGroup}>
                    <div className={composeStyles.filterGroupMain}>
                      <div className={composeStyles.filterGroupHead}>
                        <span className={composeStyles.filterGroupLabel}>
                          {t('reports.composeSortCard', { number: index + 1 })}
                        </span>
                      </div>
                      <div className={composeStyles.filterGroupFields}>
                        <div className={composeStyles.modalFilterRow}>
                          <ReportSearchMultipleSelect
                            key={`report-sort-field-${row.id}`}
                            multiple={false}
                            compact
                            name={`report-sort-field-${row.id}`}
                            label={t('reports.composeSortColumnLabel')}
                            placeholder={t('reports.composeSortColumnPlaceholder')}
                            values={uniqueColumnChoices}
                            value={columnValue}
                            serverFilter={false}
                            sx={reportFilterModalControlSx}
                            slotProps={reportFilterAutocompleteSlotProps}
                            setValueStore={(_, next) => {
                              const picked = toValuesFromSingleSelect(next)[0];
                              patchRow(row.id, {
                                columnKey: picked ? String(picked.value) : '',
                                ...(picked ? {} : { direction: 'ASC' }),
                              });
                            }}
                          />

                          {hasColumn ? (
                            <ReportSearchMultipleSelect
                              key={`report-sort-direction-${row.id}-${row.columnKey}`}
                              multiple={false}
                              compact
                              name={`report-sort-direction-${row.id}`}
                              label={t('reports.composeSortDirectionLabel')}
                              values={directionOptions}
                              value={directionValue}
                              serverFilter={false}
                              sx={reportFilterModalControlSx}
                              slotProps={reportFilterAutocompleteSlotProps}
                              setValueStore={(_, next) => {
                                const picked = toValuesFromSingleSelect(next)[0];
                                const nextDirection =
                                  picked &&
                                  (String(picked.value) === 'ASC' || String(picked.value) === 'DESC')
                                    ? (String(picked.value) as ReportSortDirection)
                                    : 'ASC';
                                patchRow(row.id, { direction: nextDirection });
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <Tooltip title={t('reports.composeRemoveSort')}>
                      <IconButton
                        type="button"
                        aria-label={t('reports.composeRemoveSort')}
                        className={`${composeStyles.filterGroupRemoveBtn} ${pageStyles.reportFilterCircleBtn}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRemove(row.id);
                        }}
                        sx={circleIconSx}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
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
