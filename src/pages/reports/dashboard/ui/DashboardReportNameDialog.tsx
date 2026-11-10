import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setError(null);
    setSaving(false);
  }, [open, defaultName]);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const message = await onSubmit(name);
      if (message) {
        setError(message);
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
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
        {error ? (
          <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        ) : null}
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
