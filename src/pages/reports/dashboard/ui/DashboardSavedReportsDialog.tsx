import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';

import { Button, ButtonsType } from '@shared/ui/button';

import { fetchSavedReports } from '../api/savedReportsApi';
import { resolveReportEntityName } from '../lib/mapAllotmentToWidget';
import type { ReportDashboardAllotmentReport } from '../types';

type Props = {
  open: boolean;
  /** @returns текст ошибки или null, если отчёт привязан. */
  onSelect: (reportId: number) => Promise<string | null>;
  onClose: () => void;
};

/** Выбор уже сохранённого отчёта для привязки к дашборду (без создания копии). */
export function DashboardSavedReportsDialog({ open, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const [reports, setReports] = useState<ReportDashboardAllotmentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQuery('');
    setError(null);
    setLoading(true);
    fetchSavedReports()
      .then((list) => {
        if (!cancelled) setReports(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setReports([]);
          setError(e instanceof Error ? e.message : 'Failed to load reports');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = !needle
      ? reports
      : reports.filter((report) =>
          `${report.name ?? ''} ${resolveReportEntityName(report)}`
            .toLowerCase()
            .includes(needle),
        );
    // ASC по наименованию — только отображение в этой модалке.
    return [...list].sort((a, b) => {
      const nameA = (a.name || resolveReportEntityName(a) || '').trim();
      const nameB = (b.name || resolveReportEntityName(b) || '').trim();
      return nameA.localeCompare(nameB, 'ru', { sensitivity: 'base' });
    });
  }, [reports, query]);

  const handleSelect = async (reportId: number) => {
    setBusyId(reportId);
    setError(null);
    try {
      const message = await onSelect(reportId);
      if (message) {
        setError(message);
      } else {
        onClose();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (busyId != null || reason === 'backdropClick') return;
        onClose();
      }}
      fullWidth
      maxWidth="sm">
      <DialogTitle>
        {t('reports.dashboard.savedReportsTitle', { defaultValue: 'Сохранённые отчёты' })}
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          sx={{ mb: 1.5, mt: 0.5 }}
          label={t('reports.dashboard.savedReportsSearch', { defaultValue: 'Поиск' })}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {error ? (
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        ) : null}
        {loading ? (
          <CircularProgress size={24} />
        ) : filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('reports.dashboard.savedReportsEmpty', {
              defaultValue: 'Нет сохранённых отчётов',
            })}
          </Typography>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {filtered.map((report) => (
              <ListItemButton
                key={report.id}
                disabled={busyId != null}
                onClick={() => void handleSelect(report.id)}>
                <ListItemText
                  primary={report.name || resolveReportEntityName(report)}
                  secondary={resolveReportEntityName(report)}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button typeButton={ButtonsType.action} disabled={busyId != null} onClick={onClose}>
          {t('common.cancel', { defaultValue: 'Отмена' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
