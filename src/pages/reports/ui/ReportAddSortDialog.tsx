import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import type { ReportSortDirection } from '@pages/reports/types/reportComposeSort';
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';
import { reportFilterAutocompleteSlotProps, reportFilterControlSx } from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';

type ReportAddSortDialogProps = {
  open: boolean;
  columnOptions: Values;
  onClose: () => void;
  onConfirm: (columnKey: string, direction: ReportSortDirection) => void;
};

type DirectionValue = '' | ReportSortDirection;

export function ReportAddSortDialog({
  open,
  columnOptions,
  onClose,
  onConfirm,
}: ReportAddSortDialogProps) {
  const { t } = useTranslation();
  const [columnKey, setColumnKey] = useState('');
  const [direction, setDirection] = useState<DirectionValue>('');
  const baselineRef = useRef({ columnKey: '', direction: '' as DirectionValue });

  useEffect(() => {
    if (!open) return;
    setColumnKey('');
    setDirection('');
    baselineRef.current = { columnKey: '', direction: '' };
  }, [open]);

  const directionOptions = useMemo(
    () =>
      [
        { value: 'ASC' as const, label: t('reports.composeSortDirectionAsc') },
        { value: 'DESC' as const, label: t('reports.composeSortDirectionDesc') },
      ] satisfies { value: ReportSortDirection; label: string }[],
    [t],
  );

  const selectedColumn = useMemo((): Values => {
    if (!columnKey) return [];
    const hit = columnOptions.find((o) => String(o.value) === columnKey);
    return hit ? [hit] : [{ value: columnKey, label: columnKey }];
  }, [columnKey, columnOptions]);

  const isDirty =
    columnKey !== baselineRef.current.columnKey || direction !== baselineRef.current.direction;
  const canConfirm = isDirty && columnKey !== '' && direction !== '';

  const handleDirectionChange = (event: SelectChangeEvent<DirectionValue>) => {
    setDirection(event.target.value as DirectionValue);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(columnKey, direction);
    setColumnKey('');
    setDirection('');
    baselineRef.current = { columnKey: '', direction: '' };
    onClose();
  };

  const handleClose = () => {
    setColumnKey('');
    setDirection('');
    baselineRef.current = { columnKey: '', direction: '' };
    onClose();
  };

  const selectedDirectionLabel =
    directionOptions.find((option) => option.value === direction)?.label ?? '';

  return (
    <Popup
      isOpen={open}
      headerTitle={t('reports.addSortDialogTitle')}
      toggleModal={handleClose}
      onCloseModal={handleClose}
      body={
        <InputsColumnWrapper>
          <ReportSearchMultipleSelect
            multiple={false}
            name="report-add-sort-column"
            label={t('reports.composeSortColumnLabel')}
            placeholder={t('reports.composeSortColumnPlaceholder')}
            values={columnOptions}
            value={selectedColumn}
            serverFilter={false}
            sx={reportFilterControlSx}
            slotProps={reportFilterAutocompleteSlotProps}
            setValueStore={(_, next) => {
              const picked = toValuesFromSingleSelect(next)[0];
              setColumnKey(picked ? String(picked.value) : '');
            }}
          />
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="report-add-sort-direction-label" shrink>
              {t('reports.composeSortDirectionLabel')}
            </InputLabel>
            <Select
              labelId="report-add-sort-direction-label"
              label={t('reports.composeSortDirectionLabel')}
              value={direction}
              displayEmpty
              onChange={handleDirectionChange}
              renderValue={(selected) => {
                if (!selected) {
                  return (
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {t('reports.composeSortDirectionLabel')}
                    </Box>
                  );
                }
                return selectedDirectionLabel;
              }}>
              <MenuItem value="">
                <Box component="em" sx={{ color: 'text.secondary', fontStyle: 'normal' }}>
                  {t('reports.composeSortDirectionLabel')}
                </Box>
              </MenuItem>
              {directionOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </InputsColumnWrapper>
      }
      buttons={[
        <Button key="add" disabled={!canConfirm} onClick={handleConfirm}>
          {t('reports.addVariantConfirm')}
        </Button>,
        <Button key="cancel" onClick={handleClose}>
          {t('common.cancel')}
        </Button>,
      ]}
    />
  );
}
