import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';

import { Button, ButtonsType } from '@shared/ui/button';

import { fetchUsersForReportFilter } from '../../lib/fetchUsersForReportFilter';
import { dashboardStore } from '../model/dashboardStore';
import type { DashboardAccessEntry, DashboardAccessLevel, ReportDashboard } from '../types';

import styles from './Dashboard.module.scss';

const LEVELS: DashboardAccessLevel[] = ['view', 'edit', 'manage'];

type Props = {
  open: boolean;
  dashboard: ReportDashboard | null;
  onClose: () => void;
};

export function DashboardAccessDialog({ open, dashboard, onClose }: Props) {
  const { t } = useTranslation();

  const levelLabel = (level: DashboardAccessLevel): string => {
    if (level === 'view') return t('reports.dashboard.accessView', { defaultValue: 'Просмотр' });
    if (level === 'edit') {
      return t('reports.dashboard.accessEdit', { defaultValue: 'Редактирование' });
    }
    return t('reports.dashboard.accessManage', { defaultValue: 'Управление' });
  };
  const setAccessList = dashboardStore((s) => s.setAccessList);
  const [rows, setRows] = useState<DashboardAccessEntry[]>([]);
  const [userOptions, setUserOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedLevel, setSelectedLevel] = useState<DashboardAccessLevel>('view');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !dashboard) return;
    setRows(dashboard.access.map((entry) => ({ ...entry })));
    setSelectedUserId('');
    setSelectedLevel('view');
    setUserSearch('');
  }, [open, dashboard]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUsers(true);
    void (async () => {
      try {
        const users = await fetchUsersForReportFilter({
          searchQuery: userSearch,
          pageSize: 50,
        });
        if (cancelled) return;
        setUserOptions(
          users
            .map((user) => {
              const id = Number(user.id);
              if (!Number.isFinite(id) || id <= 0) return null;
              const label =
                [user.surname, user.firstName, user.middleName].filter(Boolean).join(' ').trim() ||
                user.email ||
                `ID ${id}`;
              return { id, label };
            })
            .filter((row): row is { id: number; label: string } => row != null)
            .slice(0, 80),
        );
      } catch {
        if (!cancelled) setUserOptions([]);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userSearch]);

  const occupiedIds = useMemo(() => {
    const set = new Set(rows.map((row) => row.userId));
    if (dashboard) set.add(dashboard.ownerUserId);
    return set;
  }, [rows, dashboard]);

  const availableUsers = useMemo(
    () => userOptions.filter((user) => !occupiedIds.has(user.id)),
    [userOptions, occupiedIds],
  );

  const handleAdd = useCallback(() => {
    if (selectedUserId === '') return;
    const user = userOptions.find((item) => item.id === selectedUserId);
    if (!user) return;
    setRows((prev) => [
      ...prev,
      { userId: user.id, userLabel: user.label, level: selectedLevel },
    ]);
    setSelectedUserId('');
  }, [selectedUserId, selectedLevel, userOptions]);

  const handleSave = useCallback(async () => {
    if (!dashboard) return;
    setSaving(true);
    try {
      await setAccessList(dashboard.id, rows);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [dashboard, rows, setAccessList, onClose]);

  if (!dashboard) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('reports.dashboard.accessTitle', 'Доступ к дашборду')}: {dashboard.name}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {t(
            'reports.dashboard.accessOwner',
            'Владелец: {{name}}',
          ).replace('{{name}}', dashboard.ownerLabel)}
        </Typography>

        <div className={styles.accessList}>
          {rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('reports.dashboard.accessEmpty', 'Пока нет дополнительных пользователей')}
            </Typography>
          ) : (
            rows.map((row) => (
              <div key={row.userId} className={styles.accessRow}>
                <Typography variant="body2">{row.userLabel}</Typography>
                <FormControl size="small" fullWidth>
                  <InputLabel id={`access-level-${row.userId}`}>
                    {t('reports.dashboard.accessLevel', 'Уровень')}
                  </InputLabel>
                  <Select
                    labelId={`access-level-${row.userId}`}
                    label={t('reports.dashboard.accessLevel', 'Уровень')}
                    value={row.level}
                    onChange={(event) => {
                      const level = event.target.value as DashboardAccessLevel;
                      setRows((prev) =>
                        prev.map((item) =>
                          item.userId === row.userId ? { ...item, level } : item,
                        ),
                      );
                    }}>
                    {LEVELS.map((level) => (
                      <MenuItem key={level} value={level}>
                        {levelLabel(level)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  aria-label={t('reports.dashboard.accessRevoke', 'Отозвать')}
                  onClick={() =>
                    setRows((prev) => prev.filter((item) => item.userId !== row.userId))
                  }>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </div>
            ))
          )}
        </div>

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          {t('reports.dashboard.accessAdd', 'Добавить пользователя')}
        </Typography>
        <TextField
          size="small"
          fullWidth
          value={userSearch}
          onChange={(event) => setUserSearch(event.target.value)}
          label={t('reports.dashboard.accessSearch', 'Поиск пользователя')}
          sx={{ mb: 1 }}
        />
        <div className={styles.accessRow}>
          <FormControl size="small" fullWidth disabled={loadingUsers}>
            <InputLabel id="dashboard-add-user-label">
              {t('reports.dashboard.accessUser', 'Пользователь')}
            </InputLabel>
            <Select
              labelId="dashboard-add-user-label"
              label={t('reports.dashboard.accessUser', 'Пользователь')}
              value={selectedUserId === '' ? '' : String(selectedUserId)}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedUserId(value === '' ? '' : Number(value));
              }}>
              {loadingUsers ? (
                <MenuItem value="" disabled>
                  <CircularProgress size={16} />
                </MenuItem>
              ) : availableUsers.length === 0 ? (
                <MenuItem value="" disabled>
                  {t('reports.dashboard.accessNoUsers', 'Нет доступных пользователей')}
                </MenuItem>
              ) : (
                availableUsers.map((user) => (
                  <MenuItem key={user.id} value={String(user.id)}>
                    {user.label}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="dashboard-add-level-label">
              {t('reports.dashboard.accessLevel', 'Уровень')}
            </InputLabel>
            <Select
              labelId="dashboard-add-level-label"
              label={t('reports.dashboard.accessLevel', 'Уровень')}
              value={selectedLevel}
              onChange={(event) => setSelectedLevel(event.target.value as DashboardAccessLevel)}>
              {LEVELS.map((level) => (
                <MenuItem key={level} value={level}>
                  {levelLabel(level)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            typeButton={ButtonsType.action}
            startIcon={<PersonAddAlt1Icon />}
            disabled={selectedUserId === ''}
            onClick={handleAdd}>
            {t('common.add', { defaultValue: 'Добавить' })}
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button typeButton={ButtonsType.action} onClick={onClose}>
          {t('common.cancel', { defaultValue: 'Отмена' })}
        </Button>
        <Button
          typeButton={ButtonsType.action}
          disabled={saving}
          isLoading={saving}
          onClick={() => void handleSave()}>
          {t('common.save', { defaultValue: 'Сохранить' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
