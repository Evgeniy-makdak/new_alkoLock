import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  Autocomplete,
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

import { UsersApi } from '@shared/api/baseQuerys';
import { Button, ButtonsType } from '@shared/ui/button';
import type { IUser } from '@shared/types/BaseQueryTypes';

import { isReportAnonymousUser } from '../../lib/reportAnonymousUser';
import { dashboardStore } from '../model/dashboardStore';
import type { DashboardAccessEntry, DashboardAccessLevel, ReportDashboard } from '../types';

import styles from './Dashboard.module.scss';

const LEVELS: DashboardAccessLevel[] = ['view', 'edit', 'manage'];
/** Как в боковых селектах: первая порция из ответа бэка. */
const USER_PAGE_SIZE = 20;

type UserOption = { id: number; label: string };

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
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<DashboardAccessLevel>('view');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !dashboard) return;
    setRows(dashboard.access.map((entry) => ({ ...entry })));
    setSelectedUser(null);
    setSelectedLevel('view');
    setInputValue('');
    setSearchQuery('');
  }, [open, dashboard]);

  // Debounce подстроки поиска → запрос к бэку.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setSearchQuery(inputValue.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, inputValue]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUsers(true);
    void (async () => {
      try {
        const res = await UsersApi.getList(
          {
            page: 0,
            limit: USER_PAGE_SIZE,
            searchQuery: searchQuery,
            query: '&all.isActive.in=true',
          },
          false,
        );
        if (cancelled) return;
        if (res.isError || res.data == null) {
          setUserOptions([]);
          return;
        }
        const payload = res.data as { content?: IUser[] } | IUser[];
        const content = Array.isArray(payload) ? payload : (payload.content ?? []);
        setUserOptions(
          content
            .filter((user) => !isReportAnonymousUser(user))
            .map((user) => {
              const id = Number(user.id);
              if (!Number.isFinite(id) || id <= 0) return null;
              const label =
                [user.surname, user.firstName, user.middleName].filter(Boolean).join(' ').trim() ||
                user.email ||
                `ID ${id}`;
              return { id, label };
            })
            .filter((row): row is UserOption => row != null)
            .slice(0, USER_PAGE_SIZE),
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
  }, [open, searchQuery]);

  const occupiedIds = useMemo(() => {
    const set = new Set(rows.map((row) => row.userId));
    if (dashboard) set.add(dashboard.ownerUserId);
    return set;
  }, [rows, dashboard]);

  const availableUsers = useMemo(() => {
    const list = userOptions.filter((user) => !occupiedIds.has(user.id));
    // Выбранный пользователь остаётся в options, иначе Autocomplete сбрасывает label.
    if (selectedUser && !list.some((user) => user.id === selectedUser.id)) {
      return [selectedUser, ...list];
    }
    return list;
  }, [userOptions, occupiedIds, selectedUser]);

  const clearUserField = useCallback(() => {
    setSelectedUser(null);
    setInputValue('');
    setSearchQuery('');
  }, []);

  const handleAdd = useCallback(() => {
    if (!selectedUser) return;
    setRows((prev) => [
      ...prev,
      { userId: selectedUser.id, userLabel: selectedUser.label, level: selectedLevel },
    ]);
    clearUserField();
  }, [selectedUser, selectedLevel, clearUserField]);

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
        {t('reports.dashboard.accessTitle', { defaultValue: 'Доступ к дашборду' })}:{' '}
        {dashboard.name}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {t('reports.dashboard.accessOwner', {
            defaultValue: 'Владелец: {{name}}',
            name: dashboard.ownerLabel,
          }).replace('{{name}}', dashboard.ownerLabel)}
        </Typography>

        <div className={styles.accessList}>
          {rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('reports.dashboard.accessEmpty', {
                defaultValue: 'Пока нет дополнительных пользователей',
              })}
            </Typography>
          ) : (
            rows.map((row) => (
              <div key={row.userId} className={styles.accessRow}>
                <Typography variant="body2">{row.userLabel}</Typography>
                <FormControl size="small" fullWidth>
                  <InputLabel id={`access-level-${row.userId}`}>
                    {t('reports.dashboard.accessLevel', { defaultValue: 'Уровень' })}
                  </InputLabel>
                  <Select
                    labelId={`access-level-${row.userId}`}
                    label={t('reports.dashboard.accessLevel', { defaultValue: 'Уровень' })}
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
                  aria-label={t('reports.dashboard.accessRevoke', { defaultValue: 'Отозвать' })}
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
          {t('reports.dashboard.accessAdd', { defaultValue: 'Добавить пользователя' })}
        </Typography>
        <div className={styles.accessAddRow}>
          <Autocomplete
            size="small"
            fullWidth
            options={availableUsers}
            loading={loadingUsers}
            value={selectedUser}
            inputValue={inputValue}
            filterOptions={(options) => options}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, value) => {
              setSelectedUser(value);
              if (!value) {
                setInputValue('');
                setSearchQuery('');
              }
            }}
            onInputChange={(_, value, reason) => {
              if (reason === 'reset') return;
              setInputValue(value);
              if (reason === 'clear') {
                setSelectedUser(null);
                setSearchQuery('');
              }
            }}
            clearOnBlur={false}
            clearText={t('datePicker.clear', { defaultValue: 'Очистить' })}
            noOptionsText={
              loadingUsers
                ? t('common.loading', { defaultValue: 'Загрузка…' })
                : t('reports.dashboard.accessNoUsers', {
                    defaultValue: 'Нет доступных пользователей',
                  })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('reports.dashboard.accessUser', { defaultValue: 'Пользователь' })}
                placeholder={t('reports.dashboard.accessUserSearch', {
                  defaultValue: 'Начните вводить ФИО',
                })}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingUsers ? <CircularProgress color="inherit" size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <FormControl size="small" sx={{ minWidth: 140 }} fullWidth>
            <InputLabel id="dashboard-add-level-label">
              {t('reports.dashboard.accessLevel', { defaultValue: 'Уровень' })}
            </InputLabel>
            <Select
              labelId="dashboard-add-level-label"
              label={t('reports.dashboard.accessLevel', { defaultValue: 'Уровень' })}
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
            disabled={!selectedUser}
            onClick={handleAdd}>
            {t('common.add', { defaultValue: 'Добавить' })}
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          typeButton={ButtonsType.action}
          disabled={saving}
          isLoading={saving}
          onClick={() => void handleSave()}>
          {t('common.save', { defaultValue: 'Сохранить' })}
        </Button>
        <Button typeButton={ButtonsType.action} onClick={onClose}>
          {t('common.cancel', { defaultValue: 'Отмена' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
