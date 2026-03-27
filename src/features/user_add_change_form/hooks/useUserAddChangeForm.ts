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
import { userFotoStore } from '@features/user_add_foto/model/userFotoStore';
import { yupResolver } from '@hookform/resolvers/yup';
import { UsersApi } from '@shared/api/baseQuerys';
import { Permissions } from '@shared/config/permissionsEnums';
import { StatusCode, isSuccessStatus } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { AddPhotoResponse, ID } from '@shared/types/BaseQueryTypes';
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

function getNewPhotoIdFromAddResponse(payload: unknown): ID | undefined {
  if (payload == null) return undefined;
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0] as { id?: ID };
    return first?.id;
  }
  if (typeof payload === 'object' && 'id' in (payload as object)) {
    return (payload as { id: ID }).id;
  }
  return undefined;
}

/** id текущего аватара из ответов GET api/v1/users/photos/{body} (заголовки как в useUserFotoItemApi) */
async function resolvePhotoIdForUnsetAvatar(userId: ID): Promise<ID | undefined> {
  const refRes = await UsersApi.getPhotoUrlsFromGallery(userId);
  if (refRes.isError || !refRes.data?.length) return undefined;

  const metas = await Promise.all(
    refRes.data.map(async (item) => {
      const url = item?.body;
      if (!url) return null;
      const res = await UsersApi.getPhotoFromGallery(url);
      if (res.isError || !res.headers) return null;
      const h = res.headers as { id?: ID; isavatar?: string };
      const id = h.id;
      const isAvatar = h.isavatar === 'true';
      if (id == null || id === '') return null;
      return { id, isAvatar };
    }),
  );

  const avatarRow = metas.find((m) => m?.isAvatar);
  if (avatarRow?.id != null) return avatarRow.id;

  const withId = metas.filter((m): m is { id: ID; isAvatar: boolean } => m != null && m.id != null);
  if (withId.length === 1) return withId[0].id;

  return undefined;
}

export const useUserAddChangeForm = (id?: ID, closeModal?: () => void) => {
  const { t } = useTranslation();
  const selectedBranch = appStore.getState().selectedBranchState;
  const firstRender = useRef(true);
  const userClearedAvatarRef = useRef(false);
  const serverProfilePhotoIdRef = useRef<ID | undefined>(undefined);
  const [photoMutationPending, setPhotoMutationPending] = useState(false);
  const photoMutationPendingRef = useRef(false);
  const { user, isLoading, changeItem, addGalleryPhoto, createItem, groups, avatar } =
    useUserAddChangeFormApi(id);
  const { values, isGlobalAdmin, isUserDriver, isReadOnly } = groupsMapper(user, groups);

  const userPhotoSyncKey = [
    user?.userPhotoDTO?.id,
    user?.userPhotoDTO?.default,
    user?.userPhotoDTO?.hash,
    user?.userPhoto?.id,
    user?.userPhoto?.default,
    user?.userPhoto?.hash,
  ].join('|');
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
  }, [isLoading, id, userPhotoSyncKey]);

  useEffect(() => {
    if (!id || isLoading) return;
    const m = user?.userPhotoDTO ?? user?.userPhoto;
    if (m?.id != null) serverProfilePhotoIdRef.current = m.id;
  }, [id, isLoading, user?.userPhotoDTO?.id, user?.userPhoto?.id]);

  useEffect(() => {
    userClearedAvatarRef.current = false;
    serverProfilePhotoIdRef.current = undefined;
    photoMutationPendingRef.current = false;
    setPhotoMutationPending(false);
  }, [id]);

  // При смене пользователя или метаданных фото с бэка снова разрешаем однократную подстановку превью из API
  useEffect(() => {
    firstRender.current = true;
  }, [id, userPhotoSyncKey]);

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

  const setAvatar = (
    next: ImageState[],
    options?: { shouldDirty?: boolean; trackPending?: boolean },
  ) => {
    const shouldDirty = options?.shouldDirty !== false;
    const trackRefs = options?.trackPending !== undefined ? options.trackPending : shouldDirty;

    if (trackRefs && id) {
      if (next.length === 0) {
        userClearedAvatarRef.current = true;
        photoMutationPendingRef.current = true;
        setPhotoMutationPending(true);
      } else {
        userClearedAvatarRef.current = false;
        const hasNewFile = next.some((i) => i.image instanceof File);
        photoMutationPendingRef.current = hasNewFile;
        setPhotoMutationPending(hasNewFile);
      }
    }
    setValue('userPhotoDTO', next, { shouldDirty });
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
      firstRender.current &&
      !userClearedAvatarRef.current
    ) {
      firstRender.current = false;
      setAvatar(initUser.initialAvatar, { shouldDirty: false, trackPending: false });
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

    // Только для нового файла в форме: прежний аватар/Blob без File не считаем «повторной загрузкой».
    // Иначе хеш текущего аватара совпадает с миниатюрой в галерее, а isAvatar у части записей в сторе бывает false/undefined — ложное «уже добавлено».
    const userPhoto = cleanedData.userPhotoDTO?.[0];
    const isNewPhotoFile = userPhoto?.image instanceof File;
    if (isNewPhotoFile && userPhoto?.hash) {
      const usersImagesInGalary = photoData?.images;
      const imgHashToUpload = userPhoto.hash;
      for (let i = 0; i < usersImagesInGalary?.length; i++) {
        if (imgHashToUpload === usersImagesInGalary[i]?.hash && !usersImagesInGalary[i].isAvatar) {
          enqueueSnackbar('Это фото уже добавлено пользователю', { variant: 'error' });
          return false;
        }
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

    const branchId = selectedBranch && selectedBranch?.id ? selectedBranch.id : null;

    try {
      if (!id) {
        const { formData } = getDataForRequest(cleanedData, branchId, id);
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
        const dirtyFields = formState.dirtyFields ?? {};
        const needsUserPut = Object.keys(dirtyFields).some((key) => key !== 'userPhotoDTO');
        const photoAddedNewFile = Boolean(id && isNewPhotoFile && userPhoto?.image instanceof File);

        const initialSlotPhotos = initUser.defaultValues.userPhotoDTO;
        const hadInitialSlotPhoto = (initialSlotPhotos?.length ?? 0) > 0;
        const slotPhotoFromForm = getValues('userPhotoDTO') ?? cleanedData.userPhotoDTO;
        const formHasPhoto = (slotPhotoFromForm?.length ?? 0) > 0;
        const rawPhotoDirty = formState.dirtyFields?.userPhotoDTO as unknown;
        const photoFieldDirty =
          rawPhotoDirty === true ||
          (Array.isArray(rawPhotoDirty) && rawPhotoDirty.some(Boolean)) ||
          (rawPhotoDirty != null &&
            typeof rawPhotoDirty === 'object' &&
            !Array.isArray(rawPhotoDirty) &&
            Object.keys(rawPhotoDirty as object).length > 0);
        const serverPhotoMeta = user?.userPhotoDTO ?? user?.userPhoto;
        const serverProfilePhotoId =
          serverPhotoMeta?.id ??
          user?.userPhotoDTO?.id ??
          user?.userPhoto?.id ??
          serverProfilePhotoIdRef.current;
        const galleryImages = photoData?.images ?? [];
        const galleryAvatarIdByFlag = galleryImages.find(
          (img) => img.isAvatar && img.id != null,
        )?.id;
        const slotHash = initialSlotPhotos?.[0]?.hash;
        const galleryIdBySlotHash =
          slotHash != null
            ? galleryImages.find((img) => img.hash != null && img.hash === slotHash)?.id
            : undefined;
        const serverHash = serverPhotoMeta?.hash;
        const galleryIdByServerHash =
          serverHash != null
            ? galleryImages.find((img) => img.hash != null && img.hash === serverHash)?.id
            : undefined;
        /** id существующего фото профиля — нужен для PUT снятия аватара (без POST в галерею) */
        const profilePhotoIdToUnset =
          initialSlotPhotos?.[0]?.id ??
          serverProfilePhotoId ??
          serverProfilePhotoIdRef.current ??
          galleryAvatarIdByFlag ??
          galleryIdBySlotHash ??
          galleryIdByServerHash;
        /** Наличие аватара до редактирования */
        const hadAvatarEvidence = Boolean(
          hadInitialSlotPhoto ||
            serverPhotoMeta?.id != null ||
            serverPhotoMeta?.hash ||
            serverPhotoMeta?.fileName ||
            serverProfilePhotoId != null,
        );
        const userRequestedClearAvatar = Boolean(
          userClearedAvatarRef.current ||
            photoMutationPending ||
            photoMutationPendingRef.current ||
            (photoFieldDirty && !formHasPhoto && hadInitialSlotPhoto),
        );
        const clearAvatarOnSave = Boolean(
          id != null && id !== '' && !formHasPhoto && userRequestedClearAvatar && hadAvatarEvidence,
        );

        const needsPhotoWork = photoAddedNewFile || clearAvatarOnSave;

        if (!needsUserPut && !needsPhotoWork) {
          return;
        }

        if (needsUserPut) {
          const { formData } = getDataForRequest(cleanedData, branchId, id);
          const response = await changeItem(formData);
          if (
            response.status === StatusCode.BAD_REQUEST ||
            response.status === StatusCode.SERVER_ERROR
          ) {
            enqueueSnackbar(response.detail, {
              variant: 'error',
            });
            return;
          }
          if (response.status !== StatusCode.SUCCESS) {
            return;
          }
        }

        const invalidateAfterGallery = async () => {
          await client.invalidateQueries({ queryKey: [QueryKeys.USER_ITEM] });
          await client.invalidateQueries({ queryKey: [QueryKeys.AVATAR] });
          await client.invalidateQueries({ queryKey: [QueryKeys.IMAGE_URL_LIST] });
          await client.invalidateQueries({ queryKey: [QueryKeys.IMAGE_ITEM] });
        };

        const postGalleryThenSetAvatar = async (hash: string, imageBody: Blob) => {
          const galleryFd = new FormData();
          galleryFd.append('hash', hash || '');
          galleryFd.append('image', imageBody);
          galleryFd.append('userPhotoDTO.default', 'true');
          const addRes = await addGalleryPhoto(galleryFd);
          if (
            addRes?.status === StatusCode.BAD_REQUEST ||
            addRes?.status === StatusCode.SERVER_ERROR ||
            addRes.isError
          ) {
            enqueueSnackbar(addRes?.detail || addRes?.message || 'Не удалось загрузить фото', {
              variant: 'error',
            });
            return false;
          }
          const uploaded = addRes?.data as AddPhotoResponse | undefined;
          const newPhotoId = getNewPhotoIdFromAddResponse(uploaded);
          if (newPhotoId == null) {
            enqueueSnackbar('Не удалось получить id фото', { variant: 'error' });
            return false;
          }
          const avatarRes = await UsersApi.setPhotoAsAvatar(newPhotoId, id!, true);
          const avatarErr =
            avatarRes?.isError || (avatarRes?.status != null && !isSuccessStatus(avatarRes.status));
          if (avatarErr) {
            enqueueSnackbar(avatarRes?.detail || 'Не удалось назначить фото аватаром', {
              variant: 'error',
            });
            return false;
          }
          return true;
        };

        if (photoAddedNewFile && userPhoto?.image instanceof File && id != null) {
          const ok = await postGalleryThenSetAvatar(userPhoto.hash || '', userPhoto.image);
          if (!ok) return;
          await invalidateAfterGallery();
        } else if (clearAvatarOnSave && id != null) {
          let photoIdToUnset = profilePhotoIdToUnset;
          if (photoIdToUnset == null || photoIdToUnset === '') {
            photoIdToUnset = await resolvePhotoIdForUnsetAvatar(id);
          }
          if (photoIdToUnset == null || photoIdToUnset === '') {
            enqueueSnackbar(
              'Не удалось снять аватар: нет id фото в данных пользователя. Обновите карточку или проверьте ответ API.',
              { variant: 'error' },
            );
            return;
          }
          /** Снятие аватара: PUT …/photos/{userId}/photos/{photoId} — бэк снимает default (без POST файла) */
          const avatarRes = await UsersApi.setPhotoAsAvatar(photoIdToUnset, id, false);
          const avatarErr =
            avatarRes?.isError || (avatarRes?.status != null && !isSuccessStatus(avatarRes.status));
          if (avatarErr) {
            enqueueSnackbar(avatarRes?.detail || 'Не удалось снять аватар', {
              variant: 'error',
            });
            return;
          }
          /** Zustand-галерея не слушает PUT фото; без этого значок аватара остаётся до F5 */
          userFotoStore.getState().syncGalleryAvatarFromUserPhoto(id, null);
          userClearedAvatarRef.current = false;
          serverProfilePhotoIdRef.current = undefined;
          photoMutationPendingRef.current = false;
          setPhotoMutationPending(false);
          await invalidateAfterGallery();
        }

        if (
          needsUserPut &&
          cleanedData.password &&
          cleanedData.password !== initUser.defaultValues.password
        ) {
          const userName = user?.fullName;
          const userMail = cleanedData.email || user?.email;
          enqueueSnackbar(
            `Пароль для ${userName} успешно изменён и отправлен на почту ${userMail}`,
            { variant: 'success' },
          );
        }

        close();
      }
    } catch (error: any) {
      enqueueSnackbar(error?.message ?? 'Ошибка', { variant: 'error' });
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
    /** Режим редактирования: есть несохранённые изменения полей или фото / снятие аватара */
    hasFormChanges: isDirty || photoMutationPending,
  };
};
