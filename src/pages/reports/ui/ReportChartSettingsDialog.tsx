import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';

import { Button, ButtonsType } from '@shared/ui/button';

import { normalizeChartSpec, type ReportChartSpec } from '../types/chartSpec';
import { ReportChartSettingsPanel } from './ReportChartSettingsPanel';

type FieldOption = { value: string; label: string };

type Props = {
  open: boolean;
  /** Текущий/черновой spec при открытии. */
  initialSpec: ReportChartSpec;
  fieldOptions: FieldOption[];
  onApply: (spec: ReportChartSpec) => void;
  onClose: () => void;
};

/**
 * Модалка настройки графика перед переключением «вид результата → график».
 * Стили/контролы — те же, что у боковой панели (ReportChartSettingsPanel).
 */
export function ReportChartSettingsDialog({
  open,
  initialSpec,
  fieldOptions,
  onApply,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ReportChartSpec>(() =>
    normalizeChartSpec(initialSpec),
  );

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeChartSpec(initialSpec));
  }, [open, initialSpec]);

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }}
      fullWidth
      maxWidth="sm">
      <DialogTitle>
        {t('reports.chartSettingsDialogTitle', {
          defaultValue: 'Настройка графика',
        })}
      </DialogTitle>
      <DialogContent dividers>
        <ReportChartSettingsPanel
          spec={draft}
          fieldOptions={fieldOptions}
          onChange={setDraft}
        />
      </DialogContent>
      <DialogActions>
        <Button
          typeButton={ButtonsType.action}
          onClick={() => onApply(normalizeChartSpec(draft))}>
          {t('reports.chartSettingsApply', { defaultValue: 'Построить график' })}
        </Button>
        <Button typeButton={ButtonsType.action} onClick={onClose}>
          {t('common.cancel', { defaultValue: 'Отмена' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
