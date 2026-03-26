/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Checkbox, TextField, Typography } from '@mui/material';

import { AppConstants } from '@app/index';
import { RolesSelect } from '@entities/roles_select';
import { UploadImg } from '@entities/upload_img';
import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { AppAlert } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { FieldSelect } from '@shared/ui/field_select';
import { InputDate } from '@shared/ui/input_date/InputDate';
import { InputDateBirth } from '@shared/ui/input_date/InputDateBirth';
import { Loader } from '@shared/ui/loader';
import { PhoneInput } from '@shared/ui/phone_input';

import { useUserAddChangeForm } from '../hooks/useUserAddChangeForm';
import { isDisabledAdminRole } from '../lib/validate';
import style from './UserAddChangeForm.module.scss';

type UserAddChangeDesktopFormProps = {
  closeModal: () => void;
  id?: ID;
};

export const UserAddChangeDesktopForm: FC<UserAddChangeDesktopFormProps> = ({ closeModal, id }) => {
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

  // Санитизация значения, идущего в RolesSelect (на случай дубликатов/пустых).
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

  // Сортируем категории по алфавиту
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

  return (
    <Loader isLoading={isLoading}>
      <form className={style.inputsWrapper} onSubmit={state.handleSubmit}>
        <Typography fontWeight={600} marginBottom={2} variant="h6">
          {id ? t('modals.editUser') : t('modals.addUser')}
        </Typography>
        {!isLoading && (
          <>
            <div className={style.columnsWrapper}>
              <InputsColumnWrapper classN={style.inputsColumnWrapper}>
                <TextField
                  disabled={isGlobalAdmin}
                  error={Boolean(state.errors.errorsurname)}
                  helperText={state.errors.errorsurname}
                  label={t('form.surname')}
                  {...state.register('surname')}
                  onChange={handleChangeWithTrim('surname')}
                  onBlur={handleBlurWithTrim('surname')}
                />
                <TextField
                  disabled={isGlobalAdmin}
                  error={Boolean(state.errors.errorFirstName)}
                  helperText={state.errors.errorFirstName}
                  label={t('form.firstName')}
                  {...state.register('firstName')}
                  onChange={handleChangeWithTrim('firstName')}
                  onBlur={handleBlurWithTrim('firstName')}
                />
                <TextField
                  disabled={isGlobalAdmin}
                  error={Boolean(state.errors.errormiddleName)}
                  helperText={state.errors.errormiddleName}
                  label={t('form.middleName')}
                  {...state.register('middleName')}
                  onChange={handleChangeWithTrim('middleName')}
                  onBlur={handleBlurWithTrim('middleName')}
                />
                <InputDateBirth
                  disabled={isGlobalAdmin}
                  label={t('form.birthDate')}
                  testid={
                    testids.page_users.users_widget_add_user_popup
                      .USERS_WIDGET_ADD_USER_POPUP_DATE_BIRTH_INPUT
                  }
                  value={state.state.birthDate}
                  disableFuture
                  slotProps={{
                    textField: {
                      error: Boolean(state.errors.errorBirthDate),
                      helperText: state.errors.errorBirthDate,
                    },
                  }}
                  onChange={(value) => state.handlers.onChangeDate('birthDate', value)}
                />
                <PhoneInput
                  error={state.errors.errorPhone}
                  value={state.state.phone}
                  setValue={state.handlers.setPhone}
                />
                <TextField
                  inputProps={{
                    autoComplete: 'new-password',
                  }}
                  helperText={state.errors.errorEmail}
                  error={Boolean(state.errors.errorEmail)}
                  label={t('form.email')}
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
                />
                <FieldSelect
                  labelText={t('tables.access')}
                  testId={
                    testids.page_users.users_widget_add_user_popup
                      .USERS_WIDGET_ADD_USER_POPUP_ACCESS_INPUT
                  }
                  onChange={state.handlers.onChangeAccess}
                  selectProps={{ disabled: isGlobalAdmin, value: state.state.disabled }}
                  options={accessList}
                />
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
              </InputsColumnWrapper>
              <InputsColumnWrapper>
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
                  label={t('tables.roles')}
                  setValueStore={state.handlers.onSelectUserGroups}
                  multiple
                  value={sanitizedUserGroups}
                  name={'userGroups'}
                  disableCloseOnSelect
                />

                {/* Поля водительских данных - отображаются только при наличии роли "Водитель" */}
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
                    />

                    <InputDate
                      testid={
                        testids.page_users.users_widget_add_user_popup
                          .USERS_WIDGET_ADD_USER_POPUP_DATE_PERMIT_ADD_INPUT
                      }
                      disabled={!isUserDriver}
                      slotProps={{
                        textField: {
                          error: Boolean(state.errors.errorLicenseIssueDate),
                          helperText: state.errors.errorLicenseIssueDate,
                        },
                      }}
                      label={t('form.issueDate')}
                      value={state.state.licenseIssueDate}
                      disableFuture
                      onChange={(value) => state.handlers.onChangeDate('licenseIssueDate', value)}
                    />

                    <InputDate
                      testid={
                        testids.page_users.users_widget_add_user_popup
                          .USERS_WIDGET_ADD_USER_POPUP_DATE_PERMIT_END_INPUT
                      }
                      disabled={!isUserDriver}
                      slotProps={{
                        textField: {
                          error: Boolean(state.errors.errorLicenseExpirationDate),
                          helperText: state.errors.errorLicenseExpirationDate,
                        },
                      }}
                      disablePast
                      label={t('form.licenseExpiration')}
                      value={state.state.licenseExpirationDate}
                      minDateFlag
                      onChange={(value) =>
                        state.handlers.onChangeDate('licenseExpirationDate', value)
                      }
                    />

                    <div className={style.categoriesSection}>
                      <div className={style.categoriesLabel}>{t('form.selectCategory')}</div>
                      <div className={style.categoriesContainer}>
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
              </InputsColumnWrapper>
            </div>
            {!alert && (
              <ButtonFormWrapper>
                {(!id || hasFormChanges) && (
                  <Button testid={testids.POPUP_ACTION_BUTTON} type="submit">
                    {id ? t('common.save') : t('common.add')}
                  </Button>
                )}
                <Button testid={testids.POPUP_CANCEL_BUTTON} onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
              </ButtonFormWrapper>
            )}
            <AppAlert
              severity="warning"
              title='При удалении у пользователя роли "Водитель" все его привязки к ТС и данные ВУ будут удалены'
              type="submit"
              onClose={closeAlert}
              open={alert}
            />
          </>
        )}
      </form>
    </Loader>
  );
};
