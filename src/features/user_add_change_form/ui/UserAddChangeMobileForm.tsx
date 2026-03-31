/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarToday } from '@mui/icons-material';
import { Button, Checkbox, TextField, Typography } from '@mui/material';

import { AppConstants } from '@app/index';
import { RolesSelect } from '@entities/roles_select';
import { UploadImg } from '@entities/upload_img';
import { testids } from '@shared/const/testid';
import { openNativeDatePickerFromHiddenInput } from '@shared/lib/openNativeDatePickerFromHiddenInput';
import { ID } from '@shared/types/BaseQueryTypes';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { AppAlert } from '@shared/ui/alert';
import { FieldSelect } from '@shared/ui/field_select';
import { Loader } from '@shared/ui/loader';
import { PhoneInput } from '@shared/ui/phone_input';

import { useUserAddChangeForm } from '../hooks/useUserAddChangeForm';
import { isDisabledAdminRole } from '../lib/validate';
import style from './UserAddChangeForm.module.scss';

type UserAddChangeMobileFormProps = {
  closeModal: () => void;
  id?: ID;
};

export const UserAddChangeMobileForm: FC<UserAddChangeMobileFormProps> = ({ closeModal, id }) => {
  const { t } = useTranslation();
  const {
    isLoading,
    isGlobalAdmin,
    closeAlert,
    alert,
    accessList,
    state,
    control,
    isUserDriver,
    hasFormChanges,
  } = useUserAddChangeForm(id, closeModal);

  const [licenseIssueDateInput, setLicenseIssueDateInput] = useState('');
  const [licenseExpirationDateInput, setLicenseExpirationDateInput] = useState('');
  const [licenseIssueDateError, setLicenseIssueDateError] = useState('');
  const [licenseExpirationDateError, setLicenseExpirationDateError] = useState('');
  const licenseIssueDateNativeRef = useRef<HTMLInputElement>(null);
  const licenseExpirationDateNativeRef = useRef<HTMLInputElement>(null);
  const [birthDateInput, setBirthDateInput] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const birthDateNativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.state.birthDate) {
      setBirthDateInput(formatDateForDisplay(state.state.birthDate));
      setBirthDateError('');
    } else {
      setBirthDateInput('');
      setBirthDateError('');
    }
  }, [state.state.birthDate]);

  useEffect(() => {
    if (state.state.licenseIssueDate) {
      setLicenseIssueDateInput(formatDateForDisplay(state.state.licenseIssueDate));
      setLicenseIssueDateError('');
    } else {
      setLicenseIssueDateInput('');
      setLicenseIssueDateError('');
    }
  }, [state.state.licenseIssueDate]);

  useEffect(() => {
    if (state.state.licenseExpirationDate) {
      setLicenseExpirationDateInput(formatDateForDisplay(state.state.licenseExpirationDate));
      setLicenseExpirationDateError('');
    } else {
      setLicenseExpirationDateInput('');
      setLicenseExpirationDateError('');
    }
  }, [state.state.licenseExpirationDate]);

  const sanitizedUserGroups = useMemo(() => {
    const raw = Array.isArray(state?.state?.userGroups) ? state.state.userGroups : [];
    const map = new Map<any, any>();
    for (const item of raw) {
      if (!item) continue;
      const key = (item as any).id ?? (item as any).value ?? JSON.stringify(item);
      if (key === undefined || key === null) continue;
      if (!map.has(key)) map.set(key, item);
    }
    const arr = Array.from(map.values());
    return arr;
  }, [state?.state?.userGroups]);

  const sortedCategories = useMemo(() => {
    return [...AppConstants.categoryTypesList].sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Обработчик изменения поля с автоматической обрезкой
  const handleChangeWithTrim = (fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Для полей, где нужно обрезать пробелы только при потере фокуса,
    // передаём исходное значение при изменении
    if (fieldName === 'surname') {
      state.register('surname').onChange(e);
    } else if (fieldName === 'firstName') {
      state.register('firstName').onChange(e);
    } else if (fieldName === 'middleName') {
      state.register('middleName').onChange(e);
    } else if (fieldName === 'email') {
      state.register('email').onChange(e);
    } else if (fieldName === 'licenseCode') {
      state.handlers.setLicenseCode(value);
    }
  };

  // Обработчик потери фокуса с обрезкой пробелов
  const handleBlurWithTrim = (fieldName: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim();

    if (trimmedValue !== e.target.value) {
      // Создаем синтетическое событие с обрезанным значением
      const syntheticEvent = {
        target: {
          value: trimmedValue,
          name: e.target.name,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      // Обновляем значение в форме через react-hook-form
      if (fieldName === 'surname') {
        state.register('surname').onChange(syntheticEvent);
      } else if (fieldName === 'firstName') {
        state.register('firstName').onChange(syntheticEvent);
      } else if (fieldName === 'middleName') {
        state.register('middleName').onChange(syntheticEvent);
      } else if (fieldName === 'email') {
        state.register('email').onChange(syntheticEvent);
      } else if (fieldName === 'licenseCode') {
        state.handlers.setLicenseCode(trimmedValue);
      }
    }
  };

  const formatDateForDisplay = (date: any): string => {
    if (!date) return '';

    try {
      if (date?.isValid?.() && date?.format) {
        return date.format('DD.MM.YYYY');
      }

      if (date instanceof Date && !isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      }

      return '';
    } catch {
      return '';
    }
  };

  const formatDateForNative = (date: any): string => {
    if (!date) return '';

    try {
      if (date?.isValid?.() && date?.format) {
        return date.format('YYYY-MM-DD');
      }

      if (date instanceof Date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      return '';
    } catch {
      return '';
    }
  };

  const parseDateFromInput = (inputValue: string): Date | null => {
    if (!inputValue || inputValue.length < 10) return null;

    try {
      const [dayStr, monthStr, yearStr] = inputValue.split('.');
      const day = Number(dayStr);
      const month = Number(monthStr);
      const year = Number(yearStr);

      if (year < 1900 || year > 2100) return null;
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;

      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) return null;

      const date = new Date(year, month - 1, day);

      if (isNaN(date.getTime())) return null;

      return date;
    } catch {
      return null;
    }
  };

  const applyDateMask = (value: string): string => {
    const numbers = value.replace(/\D/g, '');

    let result = '';

    for (let i = 0; i < numbers.length; i++) {
      if (i === 2 || i === 4) {
        result += '.';
      }
      if (i >= 8) break;
      result += numbers[i];
    }

    return result;
  };

  const validateBirthDate = (value: string): string => {
    if (!value) return '';

    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
      return 'Неверный формат даты';
    }

    const date = parseDateFromInput(value);
    if (!date) {
      return 'Некорректная дата';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
      return 'Дата рождения не может быть позднее сегодняшнего дня';
    }

    // Проверяем что возраст не меньше 14 лет
    const minBirthDate = new Date();
    minBirthDate.setFullYear(today.getFullYear() - 14);
    if (date > minBirthDate) {
      return 'Возраст должен быть не менее 14 лет';
    }

    return '';
  };

  const validateLicenseIssueDate = (value: string): string => {
    if (!value) return '';

    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
      return 'Неверный формат даты';
    }

    const date = parseDateFromInput(value);
    if (!date) {
      return 'Некорректная дата';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
      return 'Дата выдачи не может быть позднее сегодняшнего дня';
    }

    return '';
  };

  const validateLicenseExpirationDate = (value: string): string => {
    if (!value) return '';

    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
      return 'Неверный формат даты';
    }

    const date = parseDateFromInput(value);
    if (!date) {
      return 'Некорректная дата';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return 'Дата окончания не может быть ранее сегодняшнего дня';
    }

    return '';
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maskedValue = applyDateMask(value);

    setBirthDateInput(maskedValue);

    if (maskedValue.length === 10) {
      const error = validateBirthDate(maskedValue);
      setBirthDateError(error);

      if (!error) {
        const date = parseDateFromInput(maskedValue);
        if (date) {
          state.handlers.onChangeDate('birthDate', date as any);
        }
      }
    } else if (maskedValue.length === 0) {
      state.handlers.onChangeDate('birthDate', null);
      setBirthDateError('');
    } else {
      setBirthDateError('');
    }
  };

  const handleBirthDateBlur = () => {
    if (birthDateInput && birthDateInput.length < 10) {
      setBirthDateInput(formatDateForDisplay(state.state.birthDate));
      setBirthDateError('');
    } else if (birthDateInput && birthDateInput.length === 10 && birthDateError) {
      setBirthDateInput('');
      state.handlers.onChangeDate('birthDate', null);
      setBirthDateError('');
    }
  };

  const handleBirthDateNativeChange = (value: string) => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        state.handlers.onChangeDate('birthDate', date as any);
        setBirthDateInput(formatDateForDisplay(date));
        setBirthDateError('');
      }
    } else {
      state.handlers.onChangeDate('birthDate', null);
      setBirthDateInput('');
      setBirthDateError('');
    }
  };

  const handleOpenBirthDateCalendar = () => {
    if (birthDateNativeRef.current) {
      const input = birthDateNativeRef.current;
      input.value = formatDateForNative(state.state.birthDate);
      input.style.display = 'block';
      input.style.position = 'fixed';
      input.style.top = '50%';
      input.style.left = '50%';
      input.style.transform = 'translate(-50%, -50%)';
      input.style.zIndex = '9999';
      input.style.opacity = '0.01';
      input.style.width = '100px';
      input.style.height = '40px';

      input.focus();
      input.click();

      setTimeout(() => {
        input.style.display = 'none';
      }, 100);
    }
  };

  const handleClearBirthDate = () => {
    setBirthDateInput('');
    state.handlers.onChangeDate('birthDate', null);
    setBirthDateError('');
  };

  const handleLicenseIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maskedValue = applyDateMask(value);

    setLicenseIssueDateInput(maskedValue);

    if (maskedValue.length === 10) {
      const error = validateLicenseIssueDate(maskedValue);
      setLicenseIssueDateError(error);

      if (!error) {
        const date = parseDateFromInput(maskedValue);
        if (date) {
          state.handlers.onChangeDate('licenseIssueDate', date as any);
        }
      }
    } else if (maskedValue.length === 0) {
      state.handlers.onChangeDate('licenseIssueDate', null);
      setLicenseIssueDateError('');
    } else {
      setLicenseIssueDateError('');
    }
  };

  const handleLicenseExpirationDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maskedValue = applyDateMask(value);

    setLicenseExpirationDateInput(maskedValue);

    if (maskedValue.length === 10) {
      const error = validateLicenseExpirationDate(maskedValue);
      setLicenseExpirationDateError(error);

      if (!error) {
        const date = parseDateFromInput(maskedValue);
        if (date) {
          state.handlers.onChangeDate('licenseExpirationDate', date as any);
        }
      }
    } else if (maskedValue.length === 0) {
      state.handlers.onChangeDate('licenseExpirationDate', null);
      setLicenseExpirationDateError('');
    } else {
      setLicenseExpirationDateError('');
    }
  };

  const handleLicenseIssueDateBlur = () => {
    if (licenseIssueDateInput && licenseIssueDateInput.length < 10) {
      setLicenseIssueDateInput(formatDateForDisplay(state.state.licenseIssueDate));
      setLicenseIssueDateError('');
    } else if (
      licenseIssueDateInput &&
      licenseIssueDateInput.length === 10 &&
      licenseIssueDateError
    ) {
      setLicenseIssueDateInput('');
      state.handlers.onChangeDate('licenseIssueDate', null);
      setLicenseIssueDateError('');
    }
  };

  const handleLicenseExpirationDateBlur = () => {
    if (licenseExpirationDateInput && licenseExpirationDateInput.length < 10) {
      setLicenseExpirationDateInput(formatDateForDisplay(state.state.licenseExpirationDate));
      setLicenseExpirationDateError('');
    } else if (
      licenseExpirationDateInput &&
      licenseExpirationDateInput.length === 10 &&
      licenseExpirationDateError
    ) {
      setLicenseExpirationDateInput('');
      state.handlers.onChangeDate('licenseExpirationDate', null);
      setLicenseExpirationDateError('');
    }
  };

  const handleNativeDateChange = (type: 'issue' | 'expiration', value: string) => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        if (type === 'issue') {
          state.handlers.onChangeDate('licenseIssueDate', date as any);
          setLicenseIssueDateInput(formatDateForDisplay(date));
          setLicenseIssueDateError('');
        } else {
          state.handlers.onChangeDate('licenseExpirationDate', date as any);
          setLicenseExpirationDateInput(formatDateForDisplay(date));
          setLicenseExpirationDateError('');
        }
      }
    } else {
      if (type === 'issue') {
        state.handlers.onChangeDate('licenseIssueDate', null);
        setLicenseIssueDateInput('');
        setLicenseIssueDateError('');
      } else {
        state.handlers.onChangeDate('licenseExpirationDate', null);
        setLicenseExpirationDateInput('');
        setLicenseExpirationDateError('');
      }
    }
  };

  const handleOpenCalendar = (type: 'issue' | 'expiration') => {
    if (type === 'issue') {
      const input = licenseIssueDateNativeRef.current;
      if (input) {
        input.value = formatDateForNative(state.state.licenseIssueDate);
      }
      openNativeDatePickerFromHiddenInput(input);
    } else {
      const input = licenseExpirationDateNativeRef.current;
      if (input) {
        input.value = formatDateForNative(state.state.licenseExpirationDate);
      }
      openNativeDatePickerFromHiddenInput(input);
    }
  };

  const handleClearLicenseIssueDate = () => {
    setLicenseIssueDateInput('');
    state.handlers.onChangeDate('licenseIssueDate', null);
    setLicenseIssueDateError('');
  };

  const handleClearLicenseExpirationDate = () => {
    setLicenseExpirationDateInput('');
    state.handlers.onChangeDate('licenseExpirationDate', null);
    setLicenseExpirationDateError('');
  };

  return (
    <Loader isLoading={isLoading}>
      <div className={style.mobileForm}>
        <div className={style.mobileFormHeader}>
          <Typography fontWeight={600} variant="h6">
            {id ? t('modals.editUser') : t('modals.addUser')}
          </Typography>
          <button className={style.closeMobileButton} onClick={closeModal}>
            ×
          </button>
        </div>

        {!isLoading && (
          <form onSubmit={state.handleSubmit} className={style.mobileFormContent}>
            <div className={style.mobileInputsColumn}>
              <TextField
                disabled={isGlobalAdmin}
                error={Boolean(state.errors.errorsurname)}
                helperText={state.errors.errorsurname}
                label={t('form.surname')}
                fullWidth
                {...state.register('surname')}
                onChange={handleChangeWithTrim('surname')}
                onBlur={handleBlurWithTrim('surname')}
              />
              <TextField
                disabled={isGlobalAdmin}
                error={Boolean(state.errors.errorFirstName)}
                helperText={state.errors.errorFirstName}
                label={t('form.firstName')}
                fullWidth
                {...state.register('firstName')}
                onChange={handleChangeWithTrim('firstName')}
                onBlur={handleBlurWithTrim('firstName')}
              />
              <TextField
                disabled={isGlobalAdmin}
                error={Boolean(state.errors.errormiddleName)}
                helperText={state.errors.errormiddleName}
                label={t('form.middleName')}
                fullWidth
                {...state.register('middleName')}
                onChange={handleChangeWithTrim('middleName')}
                onBlur={handleBlurWithTrim('middleName')}
              />

              {/* Поле даты рождения с маской и иконкой календаря */}
              <div className={style.dateFieldContainer}>
                <TextField
                  label={t('form.birthDate')}
                  type="text"
                  placeholder={t('datePlaceholder')}
                  value={birthDateInput}
                  onChange={handleBirthDateChange}
                  onBlur={handleBirthDateBlur}
                  size="small"
                  fullWidth
                  disabled={isGlobalAdmin}
                  error={!!birthDateError || Boolean(state.errors.errorBirthDate)}
                  helperText={birthDateError || state.errors.errorBirthDate}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    'data-testid':
                      testids.page_users.users_widget_add_user_popup
                        .USERS_WIDGET_ADD_USER_POPUP_DATE_BIRTH_INPUT,
                    inputMode: 'numeric',
                    pattern: '[0-9.]*',
                    maxLength: 10,
                  }}
                />
                <button
                  type="button"
                  className={style.calendarButton}
                  onClick={handleOpenBirthDateCalendar}
                  disabled={isGlobalAdmin}
                  aria-label="Открыть календарь для выбора даты рождения">
                  <CalendarToday fontSize="small" />
                </button>
                {birthDateInput && (
                  <button
                    type="button"
                    className={style.clearDateButton}
                    onClick={handleClearBirthDate}
                    disabled={isGlobalAdmin}
                    aria-label="Очистить дату рождения">
                    ×
                  </button>
                )}
                <input
                  ref={birthDateNativeRef}
                  type="date"
                  onChange={(e) => handleBirthDateNativeChange(e.target.value)}
                  className={style.hiddenDateInput}
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
              </div>

              <PhoneInput
                error={state.errors.errorPhone}
                value={state.state.phone}
                setValue={state.handlers.setPhone}
                fullWidth
              />
              <TextField
                inputProps={{
                  autoComplete: 'new-password',
                }}
                helperText={state.errors.errorEmail}
                error={Boolean(state.errors.errorEmail)}
                label={t('form.email')}
                fullWidth
                {...state.register('email')}
                onChange={handleChangeWithTrim('email')}
                onBlur={handleBlurWithTrim('email')}
              />
              <InputPassword
                inputProps={{
                  autoComplete: 'new-password',
                }}
                control={control}
                helperText={state.errors.errorPassword}
                error={Boolean(state.errors.errorPassword)}
                label={t('form.password')}
                name={'password'}
                fullWidth
              />
              <InputPassword
                inputProps={{
                  autoComplete: 'off',
                }}
                control={control}
                helperText={state.errors.errorPassword}
                error={Boolean(state.errors.errorPassword)}
                label={t('form.repeatPassword')}
                name={'repeatPassword'}
                fullWidth
              />
              <div style={{ width: '100%' }}>
                <FieldSelect
                  labelText={t('form.access')}
                  testId={
                    testids.page_users.users_widget_add_user_popup
                      .USERS_WIDGET_ADD_USER_POPUP_ACCESS_INPUT
                  }
                  onChange={state.handlers.onChangeAccess}
                  selectProps={{ disabled: isGlobalAdmin, value: state.state.disabled }}
                  options={accessList}
                />
              </div>
              <div style={{ width: '100%', position: 'relative', zIndex: 9999 }}>
                <RolesSelect
                  key={`${String(id ?? 'new')}:${sanitizedUserGroups
                    .map((g: any) => g?.id ?? g?.value ?? '')
                    .sort()
                    .join(',')}`}
                  testid={
                    testids.page_users.users_widget_add_user_popup
                      .USERS_WIDGET_ADD_USER_POPUP_ROLE_LIST
                  }
                  getOptionDisabled={(op) => isDisabledAdminRole(op, sanitizedUserGroups)}
                  helperText={state.errors.errorUserGroups}
                  error={Boolean(state.errors.errorUserGroups)}
                  disabled={isGlobalAdmin}
                  label={t('form.roles')}
                  setValueStore={state.handlers.onSelectUserGroups}
                  multiple
                  value={sanitizedUserGroups}
                  name={'userGroups'}
                  disableCloseOnSelect
                  slotProps={{
                    popper: {
                      style: {
                        zIndex: 9999,
                      },
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          options: {
                            boundary: 'viewport',
                          },
                        },
                      ],
                    },
                    paper: {
                      style: {
                        maxHeight: '300px',
                        zIndex: 9999,
                      },
                    },
                  }}
                  ListboxProps={{
                    style: {
                      maxHeight: '300px',
                    },
                  }}
                />
              </div>
              {isUserDriver && (
                <>
                  <TextField
                    disabled={isGlobalAdmin || !isUserDriver}
                    helperText={state.errors.errorLicenseCode}
                    error={Boolean(state.errors.errorLicenseCode)}
                    label={t('form.licenseNumber')}
                    value={state.state.licenseCode}
                    onChange={(e) => state.handlers.setLicenseCode(e?.target?.value)}
                    onBlur={handleBlurWithTrim('licenseCode')}
                    fullWidth
                  />
                  <div className={style.dateFieldContainer}>
                    <TextField
                      label={t('form.issueDate')}
                      type="text"
                      placeholder={t('datePlaceholder')}
                      value={licenseIssueDateInput}
                      onChange={handleLicenseIssueDateChange}
                      onBlur={handleLicenseIssueDateBlur}
                      size="small"
                      fullWidth
                      disabled={!isUserDriver}
                      error={!!licenseIssueDateError || Boolean(state.errors.errorLicenseIssueDate)}
                      helperText={licenseIssueDateError || state.errors.errorLicenseIssueDate}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        'data-testid':
                          testids.page_users.users_widget_add_user_popup
                            .USERS_WIDGET_ADD_USER_POPUP_DATE_PERMIT_ADD_INPUT,
                        inputMode: 'numeric',
                        pattern: '[0-9.]*',
                        maxLength: 10,
                      }}
                    />
                    <button
                      type="button"
                      className={style.calendarButton}
                      onClick={() => handleOpenCalendar('issue')}
                      disabled={!isUserDriver}
                      aria-label="Открыть календарь для выбора даты выдачи">
                      <CalendarToday fontSize="small" />
                    </button>
                    {licenseIssueDateInput && (
                      <button
                        type="button"
                        className={style.clearDateButton}
                        onClick={handleClearLicenseIssueDate}
                        disabled={!isUserDriver}
                        aria-label="Очистить дату выдачи">
                        ×
                      </button>
                    )}
                    <input
                      ref={licenseIssueDateNativeRef}
                      type="date"
                      onChange={(e) => handleNativeDateChange('issue', e.target.value)}
                      className={style.hiddenDateInput}
                      style={{ display: 'none' }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className={style.dateFieldContainer}>
                    <TextField
                      label={t('form.licenseExpiration')}
                      type="text"
                      placeholder={t('datePlaceholder')}
                      value={licenseExpirationDateInput}
                      onChange={handleLicenseExpirationDateChange}
                      onBlur={handleLicenseExpirationDateBlur}
                      size="small"
                      fullWidth
                      disabled={!isUserDriver}
                      error={
                        !!licenseExpirationDateError ||
                        Boolean(state.errors.errorLicenseExpirationDate)
                      }
                      helperText={
                        licenseExpirationDateError || state.errors.errorLicenseExpirationDate
                      }
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        'data-testid':
                          testids.page_users.users_widget_add_user_popup
                            .USERS_WIDGET_ADD_USER_POPUP_DATE_PERMIT_END_INPUT,
                        inputMode: 'numeric',
                        pattern: '[0-9.]*',
                        maxLength: 10,
                      }}
                    />
                    <button
                      type="button"
                      className={style.calendarButton}
                      onClick={() => handleOpenCalendar('expiration')}
                      disabled={!isUserDriver}
                      aria-label="Открыть календарь для выбора даты окончания">
                      <CalendarToday fontSize="small" />
                    </button>
                    {licenseExpirationDateInput && (
                      <button
                        type="button"
                        className={style.clearDateButton}
                        onClick={handleClearLicenseExpirationDate}
                        disabled={!isUserDriver}
                        aria-label="Очистить дату окончания">
                        ×
                      </button>
                    )}
                    <input
                      ref={licenseExpirationDateNativeRef}
                      type="date"
                      onChange={(e) => handleNativeDateChange('expiration', e.target.value)}
                      className={style.hiddenDateInput}
                      style={{ display: 'none' }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className={style.mobileCategoriesSection}>
                    <div className={style.categoriesLabel}>{t('form.selectCategory')}</div>
                    <div className={style.mobileCategoriesContainer}>
                      {sortedCategories.map((category) => (
                        <div className={style.categoriesItem} key={category.label}>
                          <Checkbox
                            checked={state.state.licenseClass?.includes(category.value)}
                            onClick={() => state.handlers.onSelectLicenseClass(category.value)}
                            disabled={!isUserDriver}
                          />
                          <span>{category.label}</span>
                        </div>
                      ))}
                    </div>
                    {Boolean(state.errors.errorLicenseClass) && (
                      <span className={style.error}>{state.errors.errorLicenseClass}</span>
                    )}
                  </div>
                </>
              )}
              <UploadImg
                testId={
                  testids.page_users.users_widget_add_user_popup
                    .USERS_WIDGET_ADD_USER_POPUP_ADD_FOTO
                }
                images={state.state.images}
                setImage={state.handlers.setAvatar}
                title={t('form.uploadAvatar')}
                userId={id}
              />
            </div>

            {!alert ? (
              <div className={style.mobileFormActions}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  className={style.submitButton}
                  disabled={!hasFormChanges}>
                  {id ? t('common.save') : t('common.add')}
                </Button>
                <Button
                  onClick={closeModal}
                  variant="outlined"
                  fullWidth
                  className={style.cancelButton}>
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <div className={style.mobileFormActions}>
                <div style={{ padding: '16px', textAlign: 'center', color: '#d32f2f' }}>
                  Форма заблокирована из-за предупреждения. alert: {String(alert)}
                </div>
              </div>
            )}

            <AppAlert
              severity="warning"
              title='При удалении у пользователя роли "Водитель" все его привязки к ТС и данные ВУ будут удалены'
              type="submit"
              onClose={closeAlert}
              open={alert}
            />
          </form>
        )}
      </div>
    </Loader>
  );
};
