/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { type Dayjs } from 'dayjs';
import { enqueueSnackbar } from 'notistack';

import type { ImageState } from '@entities/upload_img';
import { yupResolver } from '@hookform/resolvers/yup';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

import { useUserAddChangeFormApi } from '../api/useUserAddChangeFormApi';
import { getDataForRequest } from '../lib/getDataForRequest';
import { getFormState, getInitFormState } from '../lib/getFormState';
import { groupsMapper } from '../lib/groupsMapper';
import { type Form, type KeyForm, schema } from '../lib/validate';

export const useUserAddChangeForm = (id?: ID, closeModal?: () => void) => {
  const selectedBranch = appStore.getState().selectedBranchState;
  const firstRender = useRef(true);
  const { user, isLoading, changeItem, createItem, groups, avatar, changeFoto } =
    useUserAddChangeFormApi(id);
  const { values, isGlobalAdmin } = groupsMapper(user, groups);
  const [alert, setAlert] = useState(false);

  const initUser = getInitFormState(isLoading, values, id, user, avatar);

  const { register, control, handleSubmit, watch, clearErrors, setValue, getValues, formState } =
    useForm({
      resolver: yupResolver(schema(id)),
      defaultValues: initUser.defaultValues,
    });
  const stateOfForm = getFormState(formState, watch);

  const onSelectLicenseClass = (value: string) => {
    const licenseClass = getValues()?.licenseClass || [];
    const newLicenseClass = licenseClass?.includes(value)
      ? licenseClass.filter((val: string) => val !== value)
      : [...licenseClass, value];
    setValue('licenseClass', newLicenseClass);
  };

  const onSelectUserGroups = (type: KeyForm, value: string | Value | (string | Value)[]) => {
    const values = ArrayUtils.getArrayValues(value);
    clearErrors(type);
    setValue(type, values);
  };

  const setAvatar = (avatar: ImageState[]) => {
    setValue('userPhotoDTO', avatar);
  };

  const onChangeDate = (type: KeyForm, value: Dayjs) => {
    const errorDate = stateOfForm.errors?.errorLicenseIssueDate;
    errorDate === ValidationMessages.similarDateOfLicense
      ? clearErrors(['licenseIssueDate', 'licenseExpirationDate'])
      : clearErrors(type);
    setValue(type, value);
  };

  const onChangeAccess = (value: ID) => {
    setValue('disabled', value);
  };

  const setPhone = (value: string, type: KeyForm = 'phone') => {
    clearErrors(type);
    setValue(type, value);
  };

  const setLicenseCode = (value: string | undefined) => {
    if (!value || value?.length === 0) {
      clearErrors(['licenseClass', 'licenseExpirationDate', 'licenseIssueDate', 'licenseCode']);
    }
    const error = ValidationRules.driverLicenseValidation(value);
    if (!error) {
      clearErrors('licenseCode');
    }
    setValue('licenseCode', value);
  };

  useEffect(() => {
    if (
      avatar &&
      !isLoading &&
      stateOfForm?.state?.images?.length === 0 &&
      id &&
      firstRender.current
    ) {
      firstRender.current = false;
      setAvatar(initUser.initialAvatar);
    }
  }, [avatar]);

  const onSubmit = async (data: Form) => {
    const licenseClass = (data?.licenseClass || []).length > 0;
    const licenseIssueDate = Boolean(data?.licenseIssueDate);
    const licenseExpirationDate = Boolean(data?.licenseExpirationDate);
    const userID = id; 

    if (
      stateOfForm.state.disableDriverInfo &&
      (licenseClass || licenseIssueDate || licenseExpirationDate) &&
      !alert
    ) {
      setAlert(true);
      return;
    }

    const { formData, userData, userFoto } = getDataForRequest(
      data,
      selectedBranch && selectedBranch?.id ? selectedBranch.id : null,
      id,
    );

    try {
      if (!id) {
        const response = await createItem(formData); 
        const isError = response.isError;
        if (isError) {
          enqueueSnackbar('Ошибка создания пользователя', { variant: 'error' });
        } else {
          closeModal && closeModal();
        }
      } else {
        const isErrorChangeItem = (await changeItem(userData))?.isError;
        if (isErrorChangeItem) {
          enqueueSnackbar('Ошибка сохранения пользователя', { variant: 'error' });
        } else {
          closeModal && closeModal();
          if (userFoto) {
            const isErrorChangeFoto = (await changeFoto(userFoto))?.isError;
            if (isErrorChangeFoto) {
              enqueueSnackbar('Ошибка сохранения фото профиля', { variant: 'error' });
            }
          }
        }
      }
    } catch (error) {
      console.error('Непредвиденная ошибка:', error);
      enqueueSnackbar('Ошибка создания пользователя', { variant: 'error' });
    }
  };

  const closeAlert = () => {
    setAlert(false);
  };

  const state = {
    register,
    handleSubmit: handleSubmit(onSubmit),
    state: stateOfForm.state,
    errors: stateOfForm.errors,
    handlers: {
      onSelectLicenseClass,
      onChangeDate,
      setPhone,
      onSelectUserGroups,
      onChangeAccess,
      setLicenseCode,
      setAvatar,
    },
  };

  return {
    control,
    state,
    isLoading,
    isGlobalAdmin,
    accessList: initUser.accessList,
    closeAlert,
    alert,
  };
};
