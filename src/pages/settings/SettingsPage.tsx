/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, Snackbar } from '@mui/material';
import { useMediaQuery } from '@mui/material';

import PaginationControls from '@pages/templates/PaginationControls';
import { SettingsApi } from '@shared/api/settingsApi';
import { appStore } from '@shared/model/app_store/AppStore';

import { EditSettingDialog } from './EditSettingDialog';
import ResetConfirmationDialog from './ResetConfirmationDialog';
import { SettingsMobilePagination } from './SettingsMobilePagination';
import { SettingsSearch } from './SettingsSearch';
import { SettingsTable } from './SettingsTable';

interface Setting {
  id: number;
  label: string;
  currentValue: number;
  defaultValue: number;
  unit: 'MINUTES' | 'DAYS' | 'ATTEMPTS' | 'SECONDS';
  minValue: number;
  maxValue: number;
}

interface SettingRow {
  id: number;
  label: string;
  field: string;
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

const getUnitForm = (count: number) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return 'one';
  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) return 'few';
  return 'many';
};

export const SettingsPage = () => {
  const { t } = useTranslation();
  const [notification, setNotification] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const [settings, setSettings] = useState<Setting[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<{
    name: string;
    label: string;
    unit: string;
    minValue: number;
    maxValue: number;
  } | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [settingToReset, setSettingToReset] = useState<SettingRow | null>(null);

  // Пагинация
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const isMobile = useMediaQuery('(max-width:768px)');

  const selectedBranchId = appStore((state) => state.selectedBranchState?.id);

  const getDayWord = (count: number): string => t(`settingsUnits.day_${getUnitForm(count)}`);
  const getAttemptWord = (count: number): string =>
    t(`settingsUnits.attempt_${getUnitForm(count)}`);
  const getSecondWord = (count: number): string => t(`settingsUnits.second_${getUnitForm(count)}`);
  const getMinuteWord = (count: number): string => t(`settingsUnits.minute_${getUnitForm(count)}`);

  const getUnitDisplay = (unit: string, value: number): string => {
    switch (unit) {
      case 'MINUTES':
        return getMinuteWord(value);
      case 'DAYS':
        return getDayWord(value);
      case 'ATTEMPTS':
        return getAttemptWord(value);
      case 'SECONDS':
        return getSecondWord(value);
      default:
        return '';
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsData = await SettingsApi.getAllSettings(selectedBranchId);
      setSettings(settingsData);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Ошибка при загрузке настроек',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchSettings();
    }
  }, [selectedBranchId]);

  const handleEditClick = (row: SettingRow) => {
    setEditingField({
      name: row.field,
      label: row.label,
      unit: row.unit,
      minValue: row.minValue,
      maxValue: row.maxValue,
    });
    setEditValue(row.value);
    setErrors({});
  };

  const handleCloseModal = (
    event: Record<string, never>,
    reason: 'backdropClick' | 'escapeKeyDown' | 'buttonClick',
  ) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
    setEditingField(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    let pastedText = e.clipboardData.getData('text/plain');

    pastedText = pastedText.replace(/\D/g, '');

    if (pastedText.length > 1 && pastedText[0] === '0') {
      pastedText = pastedText.replace(/^0+/, '');
      if (pastedText === '') pastedText = '0';
    }

    const numValue = parseInt(pastedText, 10) || 0;
    setEditValue(numValue);

    if (editingField) {
      const errors = [];
      if (numValue < editingField.minValue) {
        errors.push(`Значение не может быть меньше ${editingField.minValue}`);
      }
      if (numValue > editingField.maxValue) {
        errors.push(`Значение не может быть больше ${editingField.maxValue}`);
      }
      setErrors({ [editingField.name]: errors });
    }
  };

  const handleEditValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (value.length > 1 && value[0] === '0') {
      value = value.replace(/^0+/, '');
      if (value === '') value = '0';
    }

    if (value === '') {
      setEditValue(0);
      if (editingField) {
        setErrors({ [editingField.name]: [] });
      }
      return;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      return;
    }

    setEditValue(numValue);

    if (editingField) {
      const errors = [];
      if (numValue < editingField.minValue) {
        errors.push(`Значение не может быть меньше ${editingField.minValue}`);
      }
      if (numValue > editingField.maxValue) {
        errors.push(`Значение не может быть больше ${editingField.maxValue}`);
      }
      setErrors({ [editingField.name]: errors });
    }
  };

  const handleSave = async () => {
    if (!editingField) return;

    const hasErrors = errors[editingField.name]?.length > 0;
    if (hasErrors || isNaN(editValue) || editValue < 0) return;

    try {
      setIsSaving(true);
      const settingToUpdate = settings.find((s) => s.label === editingField.label);
      if (!settingToUpdate) throw new Error('Настройка не найдена');

      const response = await SettingsApi.updateSettings([
        {
          id: settingToUpdate.id,
          value: editValue,
        },
      ]);
      // @ts-expect-error: Временное решение
      const updatedSetting = response.data[0];

      setSettings((prev) => prev.map((s) => (s.id === updatedSetting.id ? updatedSetting : s)));

      setNotification({
        open: true,
        message: `Значение параметра "${editingField.label}" изменено.`,
      });

      handleCloseModal({}, 'buttonClick');
    } catch (error) {
      setNotification({
        open: true,
        message: `Ошибка при изменении параметра "${editingField.label}"`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const handleResetToDefault = (row: SettingRow) => {
    setSettingToReset(row);
    setResetDialogOpen(true);
  };

  const handleResetConfirm = async () => {
    if (!settingToReset) return;

    try {
      const response = await SettingsApi.resetSettings([settingToReset.id]);
      // @ts-expect-error: Временное решение
      const resetSetting = response.data[0];

      setSettings((prev) => prev.map((s) => (s.id === resetSetting.id ? resetSetting : s)));

      setNotification({
        open: true,
        message: `Параметр "${settingToReset.label}" сброшен к значению по умолчанию.`,
      });
    } catch (error) {
      setNotification({
        open: true,
        message: `Ошибка при сбросе параметра "${settingToReset.label}"`,
      });
    } finally {
      setResetDialogOpen(false);
      setSettingToReset(null);
    }
  };

  const handleResetCancel = () => {
    setResetDialogOpen(false);
    setSettingToReset(null);
  };

  const handleTooltipOpen = (key: string) => setActiveTooltip(key);
  const handleTooltipClose = () => setActiveTooltip(null);

  const settingsRows: SettingRow[] = settings.map((setting) => ({
    id: setting.id,
    label: setting.label,
    field: `setting_${setting.id}`,
    value: setting.currentValue,
    unit: setting.unit,
    minValue: setting.minValue,
    maxValue: setting.maxValue,
    defaultValue: setting.defaultValue,
  }));

  const filteredSettingsRows = settingsRows.filter((row) =>
    row.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Box sx={{ p: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <SettingsSearch
          searchQuery={searchQuery}
          activeTooltip={activeTooltip}
          setSearchQuery={setSearchQuery}
          setPage={setPage}
          handleTooltipOpen={handleTooltipOpen}
          handleTooltipClose={handleTooltipClose}
        />

        <SettingsTable
          loading={loading}
          settingsRows={filteredSettingsRows}
          page={page}
          rowsPerPage={rowsPerPage}
          getUnitDisplay={getUnitDisplay}
          handleEditClick={handleEditClick}
          handleResetToDefault={handleResetToDefault}
        />

        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'background.paper',
            borderTop: '1px solid #e0e0e0',
            pb: 0,
          }}>
          {isMobile ? (
            <SettingsMobilePagination
              totalCount={filteredSettingsRows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(newPage) => setPage(newPage)}
            />
          ) : (
            <PaginationControls
              totalCount={filteredSettingsRows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(+event.target.value);
                setPage(0);
              }}
            />
          )}
        </Box>
      </div>

      <EditSettingDialog
        open={!!editingField}
        isSaving={isSaving}
        editingField={editingField}
        editValue={editValue}
        errors={errors}
        handleCloseModal={handleCloseModal}
        handleEditValueChange={handleEditValueChange}
        handlePaste={handlePaste}
        handleSave={handleSave}
        getDayWord={getDayWord}
        getAttemptWord={getAttemptWord}
        getSecondWord={getSecondWord}
        getMinuteWord={getMinuteWord}
      />

      <ResetConfirmationDialog
        open={resetDialogOpen}
        settingName={settingToReset?.label}
        onClose={handleResetCancel}
        onConfirm={handleResetConfirm}
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert
          onClose={handleCloseNotification}
          severity={notification.message.includes('Ошибка') ? 'error' : 'success'}
          sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
