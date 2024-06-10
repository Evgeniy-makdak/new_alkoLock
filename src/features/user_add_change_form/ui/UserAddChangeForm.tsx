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
  const { isLoading, isGlobalAdmin, closeAlert, alert, accessList, state, control } =
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
                  error={Boolean(state.errors.errorsurName)}
                  helperText={state.errors.errorsurName}
                  label="Фамилия"
                  {...state.register('surName')}
                />
                <TextField
                  error={Boolean(state.errors.errorFirstName)}
                  helperText={state.errors.errorFirstName}
                  label="Имя"
                  {...state.register('firstName')}
                />
                <TextField
                  error={Boolean(state.errors.errorLastName)}
                  helperText={state.errors.errorLastName}
                  label="Отчество"
                  {...state.register('lastName')}
                />
                <InputDate
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
                  selectProps={{ value: state.state.disabled }}
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
                  disabled={state?.state.disableDriverInfo}
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
                  disabled={state.state.disableDriverInfo}
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
                          disabled={state.state.disableDriverInfo}
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
                title="Введенные данные ВУ будут удалены"
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
