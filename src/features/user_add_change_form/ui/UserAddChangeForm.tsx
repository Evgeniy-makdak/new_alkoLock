import { type FC } from 'react';

import { Checkbox, TextField, Typography } from '@mui/material';

import { AppConstants } from '@app/index';
import { RolesSelect } from '@entities/roles_select';
import { UploadImg } from '@entities/upload_img';
import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
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

type UserAddChangeFormProps = {
  closeModal: () => void;
  id?: ID;
};

export const UserAddChangeForm: FC<UserAddChangeFormProps> = ({ closeModal, id }) => {
  const { isLoading, isGlobalAdmin, closeAlert, alert, accessList, state, control, isUserDriver } =
    useUserAddChangeForm(id, closeModal);

  return (
    <Loader isLoading={isLoading}>
      <form className={style.inputsWrapper} onSubmit={state.handleSubmit}>
        <Typography fontWeight={600} marginBottom={2} variant="h6">
          {id ? 'Редактирование пользователя' : 'Добавление пользователя'}
        </Typography>
        {!isLoading && (
          <>
            <div className={style.columnsWrapper}>
              <InputsColumnWrapper classN={style.inputsColumnWrapper}>
                <TextField
                  disabled={isGlobalAdmin}
                  error={Boolean(state.errors.errorsurname)}
                  helperText={state.errors.errorsurname}
                  label="Фамилия"
                  {...state.register('surname')}
                />
                <TextField
                  disabled={isGlobalAdmin}
                  error={Boolean(state.errors.errorFirstName)}
                  helperText={state.errors.errorFirstName}
                  label="Имя"
                  {...state.register('firstName')}
                />
                <TextField
                  disabled={isGlobalAdmin}
                  error={Boolean(state.errors.errormiddleName)}
                  helperText={state.errors.errormiddleName}
                  label="Отчество"
                  {...state.register('middleName')}
                />
                <InputDateBirth
                  disabled={isGlobalAdmin}
                  label="Дата рождения"
                  testid={
                    testids.page_users.users_widget_add_user_popup
                      .USERS_WIDGET_ADD_USER_POPUP_DATE_BIRTH_INPUT
                  }
                  value={state.state.birthDate}
                  disableFuture
                  onChange={(value) => state.handlers.onChangeDate('birthDate', value)}
                />
                <PhoneInput
                  error={state.errors.errorPhone}
                  value={state.state.phone}
                  setValue={state.handlers.setPhone}
                />
                <TextField
                  inputProps={{
                    autocomplete: 'new-password',
                    form: {
                      autocomplete: 'off',
                    },
                  }}
                  helperText={state.errors.errorEmail}
                  error={Boolean(state.errors.errorEmail)}
                  label={'Почта'}
                  {...state.register('email')}
                />
                <InputPassword
                  inputProps={{
                    autocomplete: 'new-password',
                    form: {
                      autocomplete: 'off',
                    },
                  }}
                  control={control}
                  helperText={state.errors.errorPassword}
                  error={Boolean(state.errors.errorPassword)}
                  label={'Пароль'}
                  name={'password'}
                />
                <FieldSelect
                  labelText="Доступ"
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
                  title="Загрузить аватар профиля"
                />
              </InputsColumnWrapper>
              <InputsColumnWrapper>
                <RolesSelect
                  testid={
                    testids.page_users.users_widget_add_user_popup
                      .USERS_WIDGET_ADD_USER_POPUP_ROLE_LIST
                  }
                  getOptionDisabled={(op) => isDisabledAdminRole(op, state.state.userGroups)}
                  helperText={state.errors.errorUserGroups}
                  error={Boolean(state.errors.errorUserGroups)}
                  disabled={isGlobalAdmin}
                  label="Роли"
                  setValueStore={state.handlers.onSelectUserGroups}
                  multiple
                  value={state.state.userGroups}
                  name={'userGroups'}
                  disableCloseOnSelect
                />
                <TextField
                  disabled={isGlobalAdmin || !isUserDriver}
                  helperText={state.errors.errorLicenseCode}
                  error={Boolean(state.errors.errorLicenseCode)}
                  label={'Номер ВУ'}
                  value={state.state.licenseCode}
                  onChange={(e) => state.handlers.setLicenseCode(e?.target?.value)}
                />
                <InputDate
                  testid={
                    testids.page_users.users_widget_add_user_popup
                      .USERS_WIDGET_ADD_USER_POPUP_DATE_PERMIT_ADD_INPUT
                  }
                  disabled={state?.state.disableDriverInfo || !isUserDriver}
                  slotProps={{
                    textField: {
                      error: Boolean(state.errors.errorLicenseIssueDate),
                      helperText: state.errors.errorLicenseIssueDate,
                    },
                  }}
                  label="Дата выдачи"
                  value={state.state.licenseIssueDate}
                  disableFuture
                  onChange={(value) => state.handlers.onChangeDate('licenseIssueDate', value)}
                />
                <InputDate
                  testid={
                    testids.page_users.users_widget_add_user_popup
                      .USERS_WIDGET_ADD_USER_POPUP_DATE_PERMIT_END_INPUT
                  }
                  disabled={state.state.disableDriverInfo || !isUserDriver}
                  slotProps={{
                    textField: {
                      error: Boolean(state.errors.errorLicenseExpirationDate),
                      helperText: state.errors.errorLicenseExpirationDate,
                    },
                  }}
                  disablePast
                  label="Дата окончания действия"
                  value={state.state.licenseExpirationDate}
                  onChange={(value) => state.handlers.onChangeDate('licenseExpirationDate', value)}
                />
                <div
                  className={`${style.wrapperCategories} ${state.state.disableDriverInfo ? style.disabledDriverData : ''}`}>
                  {AppConstants.categoryTypesList.map((category) => {
                    return (
                      <div className={style.categoriesItem} key={category.label}>
                        <Checkbox
                          checked={state.state.licenseClass?.includes(category.value)}
                          onClick={() => state.handlers.onSelectLicenseClass(category.value)}
                          disabled={state.state.disableDriverInfo || !isUserDriver}
                        />
                        <span>{category.label}</span>
                      </div>
                    );
                  })}
                  {Boolean(state.errors.errorLicenseClass) && (
                    <span className={style.error}>{state.errors.errorLicenseClass}</span>
                  )}
                </div>
              </InputsColumnWrapper>
            </div>
            {!alert && (
              <ButtonFormWrapper>
                <Button testid={testids.POPUP_ACTION_BUTTON} type="submit">
                  {id ? 'сохранить' : 'добавить'}
                </Button>
                <Button testid={testids.POPUP_CANCEL_BUTTON} onClick={closeModal}>
                  отмена
                </Button>
              </ButtonFormWrapper>
            )}
            {
              <AppAlert
                severity="warning"
                title='При удалении у пользователя роли "Водитель" все его привязки к ТС и данные ВУ будут удалены'
                type="submit"
                onClose={closeAlert}
                open={alert}
              />
            }
          </>
        )}
      </form>
    </Loader>
  );
};
