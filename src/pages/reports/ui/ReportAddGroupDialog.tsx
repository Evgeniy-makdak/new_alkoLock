import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';
import type { Values } from '@shared/ui/search_multiple_select';

import {
  reportFilterAutocompleteSlotProps,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';
import { toValuesFromSingleSelect } from '@pages/reports/lib/reportFilterSingleSelectValue';

import { ReportSearchMultipleSelect } from './ReportSearchMultipleSelect';

type ReportAddGroupDialogProps = {
  open: boolean;
  columnOptions: Values;
  onClose: () => void;
  onConfirm: (columnKey: string) => void;
};

export function ReportAddGroupDialog({
  open,
  columnOptions,
  onClose,
  onConfirm,
}: ReportAddGroupDialogProps) {
  const { t } = useTranslation();
  const [columnKey, setColumnKey] = useState('');
  const baselineRef = useRef({ columnKey: '' });

  useEffect(() => {
    if (!open) return;
    setColumnKey('');
    baselineRef.current = { columnKey: '' };
  }, [open]);

  const selectedColumn = useMemo((): Values => {
    if (!columnKey) return [];
    const hit = columnOptions.find((o) => String(o.value) === columnKey);
    return hit ? [hit] : [{ value: columnKey, label: columnKey }];
  }, [columnKey, columnOptions]);

  const isDirty = columnKey !== baselineRef.current.columnKey;
  const canConfirm = isDirty && columnKey !== '';

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(columnKey);
    setColumnKey('');
    baselineRef.current = { columnKey: '' };
    onClose();
  };

  const handleClose = () => {
    setColumnKey('');
    baselineRef.current = { columnKey: '' };
    onClose();
  };

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
