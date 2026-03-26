/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { type Dayjs } from 'dayjs';
import { enqueueSnackbar } from 'notistack';

import type { ImageState } from '@entities/upload_img';
import { useUserRolesStore } from '@features/user_add_change_form/userRolesStore';
import { yupResolver } from '@hookform/resolvers/yup';
import { Permissions } from '@shared/config/permissionsEnums';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';
import { useQueryClient } from '@tanstack/react-query';
import { useUserFoto } from '@widgets/user_foto/hooks/useUserFoto';

import { useUserAddChangeFormApi } from '../api/useUserAddChangeFormApi';
import { getDataForRequest } from '../lib/getDataForRequest';
import { getFormState, getInitFormState } from '../lib/getFormState';
import { groupsMapper } from '../lib/groupsMapper';
import { type Form, type KeyForm, schema } from '../lib/validate';

export const useUserAddChangeForm = (id?: ID, closeModal?: () => void) => {
  const { t } = useTranslation();
  const selectedBranch = appStore.getState().selectedBranchState;
  const firstRender = useRef(true);
  const { user, isLoading, changeItem, createItem, groups, avatar } = useUserAddChangeFormApi(id);
  const { values, isGlobalAdmin, isUserDriver, isReadOnly } = groupsMapper(user, groups);
  const [alert, setAlert] = useState(false);

  const setSelectedRoleIds = useUserRolesStore((state) => state.setSelectedRoleIds);

  const photoData = useUserFoto(user?.id);

  const initUser = getInitFormState(isLoading, values, id, user, avatar, t);
  const close = () => {
    const event = new CustomEvent('user_change_success');
    document.dispatchEvent(event);
    closeModal && closeModal();
  };

  // Динамически определяем, есть ли роль "Водитель" для валидации
  const [hasDriverRole, setHasDriverRole] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    clearErrors,
    setValue,
    getValues,
    formState: { isDirty },
    formState,
    reset,
    trigger,
  } = useForm({
    resolver: yupResolver(schema(id, isGlobalAdmin, hasDriverRole)),
    defaultValues: initUser.defaultValues,
  });

  // Следим за изменением ролей и обновляем hasDriverRole
  useEffect(() => {
    const subscription = watch((value) => {
      const userGroups = value.userGroups || [];
      const driverRoleSelected = userGroups.some((group: any) =>
        group?.permissions?.includes(Permissions.SYSTEM_DRIVER_ACCOUNT as never),
      );
      setHasDriverRole(driverRoleSelected);

      // Если роль водителя убрана, очищаем ошибки валидации полей водителя
      if (!driverRoleSelected) {
        clearErrors(['licenseCode', 'licenseIssueDate', 'licenseExpirationDate', 'licenseClass']);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, clearErrors]);

  useEffect(() => {
    reset(initUser.defaultValues);
  }, [isLoading, id]);

  // При смене пользователя снова разрешаем подставить аватар из API (firstRender иначе остаётся false)
  useEffect(() => {
    firstRender.current = true;
  }, [id]);

  const stateOfForm = getFormState(formState, watch);

  const client = useQueryClient();

  const onSelectLicenseClass = (value: string) => {
    const licenseClass = getValues()?.licenseClass || [];
    const newLicenseClass = licenseClass.includes(value)
      ? licenseClass.filter((val: string) => val !== value)
      : [...licenseClass, value];
    setValue('licenseClass', newLicenseClass, { shouldDirty: true });
  };

  const onSelectUserGroups = (type: KeyForm, value: string | Value | (string | Value)[]) => {
    const values = ArrayUtils.getArrayValues(value);
    clearErrors(type);
    setValue(type, values, { shouldDirty: true });

    const valueIds = values.map((item: Value) => String((item as any).value ?? (item as any).id));
    setSelectedRoleIds(valueIds);
  };

  const setAvatar = (next: ImageState[], options?: { shouldDirty?: boolean }) => {
    setValue('userPhotoDTO', next, { shouldDirty: options?.shouldDirty !== false });
  };

  // const resetPassword = async (data: { email: string; newPassword: string; token: string }) => {
  //   return putQuery({ url: `api/account/reset-password/finish`, data });
  // };

  const onChangeDate = (type: KeyForm, value: Dayjs) => {
    const errorDate = stateOfForm.errors?.errorLicenseIssueDate;
    errorDate === ValidationMessages.similarDateOfLicense
      ? clearErrors(['licenseIssueDate', 'licenseExpirationDate'])
      : clearErrors(type);
    setValue(type, value, { shouldDirty: true });
  };

  const onChangeAccess = (value: ID) => {
    setValue('disabled', value, { shouldDirty: true });
  };

  const setPhone = (value: string, type: KeyForm = 'phone') => {
    clearErrors(type);
    setValue(type, value, { shouldDirty: true });
  };

  const setLicenseCode = (value: string | undefined) => {
    // 🔧 FIX: Убираем всю кастомную валидацию - пусть работает только через yup
    clearErrors('licenseCode');
    setValue('licenseCode', value, { shouldDirty: true });
  };

  useEffect(() => {
    if (
      avatar &&
      !isLoading &&
      stateOfForm.state.images.length === 0 &&
      id &&
      firstRender.current
    ) {
      firstRender.current = false;
      setAvatar(initUser.initialAvatar, { shouldDirty: false });
    }
  }, [id, initUser.initialAvatar, isLoading, setAvatar, stateOfForm.state.images.length, avatar]);

  // =======================
  // 🔧 FIX: Реконсиляция ролей после загрузки пользователя/ролей
  // Убираем из формы и стора роли, которых нет среди доступных (например, удалённые как сущность),
  // а также синхронизируем selectedRoleIds в zustand.
  // =======================

  // Вспомогалки для надёжного извлечения id и дедупликации
  const getGroupId = (g: any): string =>
    String(g?.value ?? g?.id ?? g?.groupId ?? g?.group?.id ?? '');

  const uniqById = (arr: any[]) => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const it of arr) {
      const idStr = getGroupId(it);
      if (!idStr || seen.has(idStr)) continue;
      seen.add(idStr);
      out.push(it);
    }
    return out;
  };

  const arraysShallowEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x, i) => x === b[i]);

  useEffect(() => {
    if (isLoading) return;

    // Текущие значения из формы (после reset по initUser)
    const currentUserGroups: any[] = Array.isArray(getValues()?.userGroups)
      ? (getValues().userGroups as any[])
      : [];

    // Доступные роли (что есть сейчас как сущности)
    const available = Array.isArray(groups) ? (groups as any[]) : [];
    const availableIds = new Set<string>(
      available.map((g) => String(g?.id ?? g?.value ?? g?.groupId ?? g?.group?.id ?? '')),
    );

    // Если список доступных ролей ещё не получен – ничего не делаем
    if (availableIds.size === 0) return;

    // Санитизируем текущие роли формы: оставляем только те, что реально существуют
    const sanitized = uniqById(
      currentUserGroups.filter((it) => {
        const idStr = getGroupId(it);
        return idStr && availableIds.has(idStr);
      }),
    );

    const prevIds = currentUserGroups.map((it) => getGroupId(it));
    const nextIds = sanitized.map((it) => getGroupId(it));

    // Логи для диагностики порядка событий (можно удалить после проверки)
    // eslint-disable-next-line no-console
    console.debug('[useUserAddChangeForm] reconcile roles', {
      userId: String(id ?? 'new'),
      fromServer_groupMembership: user?.groupMembership?.map((gm: any) => gm?.group?.id),
      availableRoleIds: Array.from(availableIds),
      beforeFormIds: prevIds,
      afterFormIds: nextIds,
    });

    // Если что-то изменилось (удалили отсутствующие роли/дедуплицировали) — записываем в форму
    const needUpdateForm =
      prevIds.length !== nextIds.length ||
      !arraysShallowEqual([...prevIds].sort(), [...nextIds].sort());

    if (needUpdateForm) {
      setValue('userGroups', sanitized, { shouldDirty: false });
    }

    // В любом случае синхронизируем zustand-стор под актуальные id
    const storeIds = nextIds;
    setSelectedRoleIds(storeIds);
  }, [isLoading, user?.id, groups]);

  const onSubmit = async (data: Form) => {
    // 🔧 FIX: Убираем обрезку данных здесь - она должна происходить в валидации
    // Это позволяет валидации видеть исходные данные с пробелами
    const cleanedData = { ...data };
    if (!hasDriverRole) {
      cleanedData.licenseCode = '';
      cleanedData.licenseIssueDate = null;
      cleanedData.licenseExpirationDate = null;
      cleanedData.licenseClass = [];

      // 🔧 FIX: Очищаем ошибки валидации для полей водителя перед отправкой
      clearErrors(['licenseCode', 'licenseIssueDate', 'licenseExpirationDate', 'licenseClass']);
    }

    // 🔧 FIX: УБИРАЕМ обрезку данных здесь - она перенесена в схему валидации
    // const trimmedData = Object.entries(cleanedData).reduce((acc, [key, value]) => {
    //   acc[key as keyof Form] = typeof value === 'string' ? value.trim() : (value as any);
    //   return acc;
    // }, {} as Form);

    const licenseClass = (cleanedData.licenseClass || []).length > 0;
    const licenseIssueDate = Boolean(cleanedData.licenseIssueDate);
    const licenseExpirationDate = Boolean(cleanedData.licenseExpirationDate);
    const usersImagesInGalary = photoData?.images;

    const imgHashToUpload = cleanedData.userPhotoDTO[0]?.hash;

    for (let i = 0; i < usersImagesInGalary?.length; i++) {
      if (imgHashToUpload === usersImagesInGalary[i]?.hash && !usersImagesInGalary[i].isAvatar) {
        enqueueSnackbar('Это фото уже добавлено пользователю', { variant: 'error' });
        return false;
      }
    }

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

    // 🔧 FIX: Используем cleanedData вместо trimmedData
    const { formData } = getDataForRequest(
      cleanedData,
      selectedBranch && selectedBranch?.id ? selectedBranch.id : null,
      id,
    );

    try {
      if (!id) {
        const response = await createItem(formData);
        if (
          response.status === StatusCode.BAD_REQUEST ||
          response.status === StatusCode.SERVER_ERROR
        ) {
          enqueueSnackbar(response.detail, { variant: 'error' });
        } else {
          close();
        }
      } else {
        const response = await changeItem(formData);
        if (
          response.status === StatusCode.BAD_REQUEST ||
          response.status === StatusCode.SERVER_ERROR
        ) {
          enqueueSnackbar(response.detail, {
            variant: 'error',
          });
        } else if (response.status === StatusCode.SUCCESS) {
          // Проверяем, изменился ли пароль
          if (cleanedData.password && cleanedData.password !== initUser.defaultValues.password) {
            const userName = user?.fullName;
            // Используем новую почту из формы, если она была изменена
            const userMail = cleanedData.email || user?.email;

            enqueueSnackbar(
              `Пароль для ${userName} успешно изменён и отправлен на почту ${userMail}`,
              {
                variant: 'success',
              },
            );
          }
          close();
        }
      }
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      client.invalidateQueries({ queryKey: [QueryKeys.IMAGE_URL_LIST] });
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

  const isDriver = stateOfForm.state.userGroups?.find((elem) =>
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
    /** Режим редактирования: есть несохранённые изменения полей или фото */
    hasFormChanges: isDirty,
  };
};
