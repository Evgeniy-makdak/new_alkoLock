import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { enqueueSnackbar } from 'notistack';

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

import { Button, ButtonsType } from '@shared/ui/button';

type Props = {
  open: boolean;
  defaultName: string;
  /** @returns текст ошибки или null, если отчёт сохранён и привязан. */
  onSubmit: (name: string) => Promise<string | null>;
  onClose: () => void;
};

/** Название нового сохраняемого отчёта (отчёт хранится отдельно и может быть на нескольких дашбордах). */
export function DashboardReportNameDialog({ open, defaultName, onSubmit, onClose }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setSaving(false);
  }, [open, defaultName]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const message = await onSubmit(name);
      if (message) {
        // Дубль имени / ошибка бэка — красная плашка; диалог не закрываем.
        enqueueSnackbar(message, { variant: 'error' });
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (saving || reason === 'backdropClick') return;
        onClose();
      }}
      fullWidth
      maxWidth="xs">
      <DialogTitle>
        {t('reports.dashboard.reportNameTitle', { defaultValue: 'Название отчёта' })}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('reports.dashboard.reportNameHint', {
            defaultValue:
              'Отчёт будет сохранён и сможет использоваться на других дашбордах. Название должно быть уникальным.',
          })}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={t('reports.dashboard.reportName', { defaultValue: 'Название' })}
          value={name}
          disabled={saving}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !saving) void handleSubmit();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button
          typeButton={ButtonsType.action}
          disabled={saving || !name.trim()}
          isLoading={saving}
          onClick={() => void handleSubmit()}>
          {t('common.save', { defaultValue: 'Сохранить' })}
        </Button>
        <Button typeButton={ButtonsType.action} disabled={saving} onClick={onClose}>
          {t('common.cancel', { defaultValue: 'Отмена' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
