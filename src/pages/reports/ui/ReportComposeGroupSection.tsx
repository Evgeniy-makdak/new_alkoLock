import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { IconButton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import type { ReportComposeGroupRow } from '@pages/reports/types/reportComposeGroup';
import { getToolbarCircleIconButtonSx } from '@shared/lib/toolbarCircleAddButtonSx';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportAddGroupDialog } from './ReportAddGroupDialog';
import composeStyles from './ReportComposeModal.module.scss';
import { ReportComposeSection } from './ReportComposeSection';
import pageStyles from './Reports.module.scss';

type ReportComposeGroupSectionProps = {
  columnOptions: Values;
  groupRows: ReportComposeGroupRow[];
  onChange: (rows: ReportComposeGroupRow[]) => void;
};

export function ReportComposeGroupSection({
  columnOptions,
  groupRows,
  onChange,
}: ReportComposeGroupSectionProps) {
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

  const usedColumnKeys = useMemo(
    () => new Set(groupRows.map((row) => row.columnKey)),
    [groupRows],
  );

  const availableColumnOptions = useMemo(
    () => columnOptions.filter((option) => !usedColumnKeys.has(String(option.value))),
    [columnOptions, usedColumnKeys],
  );

  const handleConfirmAdd = (columnKey: string) => {
    onChange([
      ...groupRows,
      {
        id: `report-group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        columnKey,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    onChange(groupRows.filter((row) => row.id !== id));
  };

  const canAddGroup = availableColumnOptions.length > 0;

  return (
    <>
      <ReportComposeSection
        icon={LayersOutlinedIcon}
        iconTone="amber"
        title={t('reports.composeSectionGroup')}
        action={
          <button
            type="button"
            className={composeStyles.addGroupLink}
            disabled={!canAddGroup}
            onClick={() => setAddDialogOpen(true)}>
            {t('reports.composeAddGroup')}
          </button>
        }>
        <div className={composeStyles.sortSectionBody}>
          {groupRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('reports.composeGroupColumnPlaceholder')}
            </Typography>
          ) : (
            groupRows.map((row) => {
              const columnLabel = columnLabelByKey.get(row.columnKey) ?? row.columnKey;
              return (
                <div key={row.id} className={composeStyles.sortRow}>
                  <div className={composeStyles.sortRowFields}>
                    <Typography variant="body2" component="span">
                      {columnLabel}
                    </Typography>
                  </div>
                  <Tooltip title={t('reports.composeRemoveGroup')}>
                    <IconButton
                      type="button"
                      aria-label={t('reports.composeRemoveGroup')}
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

      <ReportAddGroupDialog
        open={addDialogOpen}
        columnOptions={availableColumnOptions}
        onClose={() => setAddDialogOpen(false)}
        onConfirm={handleConfirmAdd}
      />
    </>
  );
}
