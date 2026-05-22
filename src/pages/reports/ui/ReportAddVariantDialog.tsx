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

import type { ReportLogicOperator } from '@pages/reports/types/reportApiTypes';

type LogicOperatorValue = '' | ReportLogicOperator;

type ReportAddVariantDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (logicOperator: ReportLogicOperator) => void;
};

export function ReportAddVariantDialog({ open, onClose, onConfirm }: ReportAddVariantDialogProps) {
  const { t } = useTranslation();
  const [logicOperator, setLogicOperator] = useState<LogicOperatorValue>('');
  const baselineRef = useRef<LogicOperatorValue>('');

  useEffect(() => {
    if (!open) return;
    setLogicOperator('');
    baselineRef.current = '';
  }, [open]);

  const logicOptions = useMemo(
    () =>
      [
        { value: 'or' as const, label: t('reports.logicOr') },
        { value: 'and' as const, label: t('reports.logicAnd') },
      ] satisfies { value: ReportLogicOperator; label: string }[],
    [t],
  );

  const isDirty = logicOperator !== baselineRef.current;
  const canConfirm = isDirty && logicOperator !== '';

  const handleLogicChange = (event: SelectChangeEvent<LogicOperatorValue>) => {
    setLogicOperator(event.target.value as LogicOperatorValue);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(logicOperator);
    setLogicOperator('');
    baselineRef.current = '';
    onClose();
  };

  const handleClose = () => {
    setLogicOperator('');
    baselineRef.current = '';
    onClose();
  };

  const selectedLabel =
    logicOptions.find((option) => option.value === logicOperator)?.label ?? '';

  return (
    <Popup
      isOpen={open}
      headerTitle={t('reports.addVariantDialogTitle')}
      toggleModal={handleClose}
      onCloseModal={handleClose}
      body={
        <InputsColumnWrapper>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="report-add-variant-logic-label" shrink>
              {t('reports.addVariantLogicPlaceholder')}
            </InputLabel>
            <Select
              labelId="report-add-variant-logic-label"
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
                return selectedLabel;
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
