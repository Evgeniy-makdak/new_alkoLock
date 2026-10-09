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
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';
import type { Values } from '@shared/ui/search_multiple_select';

import {
  reportFilterAutocompleteSlotProps,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';
import type { ReportLogicOperator } from '@pages/reports/types/reportApiTypes';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

type LogicOperatorValue = '' | ReportLogicOperator;

export type ReportAddGroupConfirm = {
  columnKey: string;
  logicOperator?: ReportLogicOperator;
};

type ReportAddGroupDialogProps = {
  open: boolean;
  columnOptions: Values;
  /** true — уже есть группировки: нужно выбрать И/ИЛИ, как у фильтров. */
  requireLogicOperator?: boolean;
  onClose: () => void;
  onConfirm: (payload: ReportAddGroupConfirm) => void;
};

export function ReportAddGroupDialog({
  open,
  columnOptions,
  requireLogicOperator = false,
  onClose,
  onConfirm,
}: ReportAddGroupDialogProps) {
  const { t } = useTranslation();
  const [columnKey, setColumnKey] = useState('');
  const [logicOperator, setLogicOperator] = useState<LogicOperatorValue>('');
  const baselineRef = useRef({ columnKey: '', logicOperator: '' as LogicOperatorValue });

  useEffect(() => {
    if (!open) return;
    setColumnKey('');
    setLogicOperator('');
    baselineRef.current = { columnKey: '', logicOperator: '' };
  }, [open]);

  const selectedColumn = useMemo((): Values => {
    if (!columnKey) return [];
    const hit = columnOptions.find((o) => String(o.value) === columnKey);
    return hit ? [hit] : [{ value: columnKey, label: columnKey }];
  }, [columnKey, columnOptions]);

  const logicOptions = useMemo(
    () =>
      [
        { value: 'or' as const, label: t('reports.logicOr') },
        { value: 'and' as const, label: t('reports.logicAnd') },
      ] satisfies { value: ReportLogicOperator; label: string }[],
    [t],
  );

  const isDirty =
    columnKey !== baselineRef.current.columnKey ||
    (requireLogicOperator && logicOperator !== baselineRef.current.logicOperator);
  const canConfirm =
    isDirty &&
    columnKey !== '' &&
    (!requireLogicOperator || logicOperator !== '');

  const handleLogicChange = (event: SelectChangeEvent<LogicOperatorValue>) => {
    setLogicOperator(event.target.value as LogicOperatorValue);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      columnKey,
      ...(requireLogicOperator && logicOperator ? { logicOperator } : {}),
    });
    setColumnKey('');
    setLogicOperator('');
    baselineRef.current = { columnKey: '', logicOperator: '' };
    onClose();
  };

  const handleClose = () => {
    setColumnKey('');
    setLogicOperator('');
    baselineRef.current = { columnKey: '', logicOperator: '' };
    onClose();
  };

  const selectedLogicLabel =
    logicOptions.find((option) => option.value === logicOperator)?.label ?? '';

  return (
    <Popup
      isOpen={open}
      headerTitle={t('reports.addGroupDialogTitle')}
      toggleModal={handleClose}
      onCloseModal={handleClose}
      closeonClickSpace={false}
      closeOnEscapeKey={false}
      body={
        <InputsColumnWrapper>
          {requireLogicOperator ? (
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="report-add-group-logic-label" shrink>
                {t('reports.addVariantLogicPlaceholder')}
              </InputLabel>
              <Select
                labelId="report-add-group-logic-label"
                label={t('reports.addVariantLogicPlaceholder')}
                value={logicOperator}
                displayEmpty
                onChange={handleLogicChange}
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {t('reports.addVariantLogicPlaceholder')}
                      </Box>
                    );
                  }
                  return selectedLogicLabel;
                }}>
                <MenuItem value="">
                  <Box component="em" sx={{ color: 'text.secondary', fontStyle: 'normal' }}>
                    {t('reports.addVariantLogicPlaceholder')}
                  </Box>
                </MenuItem>
                {logicOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <ReportSearchMultipleSelect
            multiple={false}
            compact
            name="report-add-group-column"
            label={t('reports.composeGroupColumnLabel')}
            placeholder={t('reports.composeGroupColumnPlaceholder')}
            values={columnOptions}
            value={selectedColumn}
            serverFilter={false}
            sx={reportFilterModalControlSx}
            slotProps={reportFilterAutocompleteSlotProps}
            setValueStore={(_, next) => {
              const picked = toValuesFromSingleSelect(next)[0];
              setColumnKey(picked ? String(picked.value) : '');
            }}
          />
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
