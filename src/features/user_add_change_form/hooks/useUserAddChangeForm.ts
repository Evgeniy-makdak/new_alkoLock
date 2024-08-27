/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { type Dayjs } from 'dayjs';
import { enqueueSnackbar } from 'notistack';

import type { ImageState } from '@entities/upload_img';
import { yupResolver } from '@hookform/resolvers/yup';
import { Permissions } from '@shared/config/permissionsEnums';
import { StatusCode } from '@shared/const/statusCode';
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
  const { user, isLoading, changeItem, createItem, groups, avatar } = useUserAddChangeFormApi(id);
  const { values, isGlobalAdmin, isUserDriver, isReadOnly } = groupsMapper(user, groups?.content);
  const [alert, setAlert] = useState(false);

  const initUser = getInitFormState(isLoading, values, id, user, avatar);

  const close = () => {
    const event = new CustomEvent('user_change_sucsess');
    document.dispatchEvent(event);
    closeModal && closeModal();
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    clearErrors,
    setValue,
    getValues,
    formState,
    reset,
  } = useForm({
    resolver: yupResolver(schema(id, isGlobalAdmin)),
    defaultValues: initUser.defaultValues,
  });
  useEffect(() => {
    reset(initUser.defaultValues);
  }, [isLoading]);
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
  }, [
    id,
    initUser.initialAvatar,
    isLoading,
    setAvatar,
    stateOfForm?.state?.images?.length,
    avatar,
  ]);

  async function clearCache() {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
  }

  const onSubmit = async (data: Form) => {
    const licenseClass = (data?.licenseClass || []).length > 0;
    const licenseIssueDate = Boolean(data?.licenseIssueDate);
    const licenseExpirationDate = Boolean(data?.licenseExpirationDate);

    if (
      stateOfForm.state.disableDriverInfo &&
      (licenseClass || licenseIssueDate || licenseExpirationDate) &&
      !alert
    ) {
      setAlert(true);
      return;
    }

    if (
      isUserDriver &&
      !stateOfForm.state.userGroups?.find((elem) =>
        elem.permissions?.includes(Permissions.SYSTEM_DRIVER_ACCOUNT as never),
      ) &&
      !alert
    ) {
      setAlert(true);
      return;
    }

    const { formData } = getDataForRequest(
      data,
      selectedBranch && selectedBranch?.id ? selectedBranch.id : null,
      id,
    );

    try {
      if (!id) {
        const response = await createItem(formData);
        if (response.status === StatusCode.BAD_REQUEST) {
          const messageStart =
            response?.detail.split(',')[6].indexOf('message=') + 'message='.length;
          enqueueSnackbar(response?.detail.split(',')[6].substring(messageStart).trim(), {
            variant: 'error',
          });
        } else {
          close();
        }
      } else {
        const response = await changeItem(formData);
        if (response.status === StatusCode.BAD_REQUEST) {
          const messageStart =
            response?.detail.split(',')[6].indexOf('message=') + 'message='.length;
          enqueueSnackbar(response?.detail.split(',')[6].substring(messageStart).trim(), {
            variant: 'error',
          });
        } else if (response.status === StatusCode.SUCCESS) {
          // enqueueSnackbar(response?.detail || 'Профиль успешно обновлён!', { variant: 'success' });
          close();
        }
        // const isErrorChangeItem = response?.isError;
        // if (isErrorChangeItem) {
        //   enqueueSnackbar(response.detail, { variant: 'error' });
        // } else {
        //   close();
        // }
      }
    } catch (error) {
      const responseCreate = await createItem(formData);
      const responseChange = await changeItem(formData);

      if (!id && responseCreate.status === StatusCode.BAD_REQUEST) {
        enqueueSnackbar(responseCreate?.detail, { variant: 'error' });
      } else {
        enqueueSnackbar(responseChange?.detail, { variant: 'error' });
      }
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

  const isDriver = // isUserDriver &&
    stateOfForm.state.userGroups?.find((elem) =>
      elem.permissions?.includes(Permissions.SYSTEM_DRIVER_ACCOUNT as never),
    );

  return {
    control,
    state,
    isLoading,
    isGlobalAdmin,
    isUserDriver: isDriver,
    isReadOnly,
    accessList: initUser.accessList,
    closeAlert,
    alert,
  };
};
