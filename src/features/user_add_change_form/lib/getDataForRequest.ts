/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateUserData, ID } from '@shared/types/BaseQueryTypes';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { Form } from './validate';

// Вспомогательная функция для форматирования дат из Dayjs или Date
const formatDateUniversal = (date: any): string | null => {
  if (!date) return null;

  // Для Dayjs объектов
  if (date.isValid && typeof date.isValid === 'function' && date.isValid()) {
    return date.format('YYYY-MM-DD');
  }

  // Для Date объектов
  if (date instanceof Date && !isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
};

export const getDataForRequest = (
  data: Form,
  branchId: ID,
  userID: ID,
): { formData?: FormData | null; userData?: CreateUserData | null; userFoto?: FormData | null } => {
  const userGroups = ArrayUtils.getArrayFromValues(data?.userGroups);
  const licenseCode = data?.licenseCode || '';
  const phone = data?.phone?.trim();
  const middleName = data?.middleName || '';
  const password = data?.password;

  // УНИВЕРСАЛЬНОЕ ФОРМАТИРОВАНИЕ ДАТ
  const birthDate = formatDateUniversal(data?.birthDate) || '';
  const hasDriver = Boolean(licenseCode);
  const licenseExpirationDate = hasDriver ? formatDateUniversal(data?.licenseExpirationDate) : null;
  const licenseIssueDate = hasDriver ? formatDateUniversal(data?.licenseIssueDate) : null;

  const image = data?.userPhotoDTO?.length > 0 ? data?.userPhotoDTO[0] : null;
  const imageBody = image?.image ?? null;
  /** Только новый выбор файла уходит в multipart; серверный Blob превью не дублируем в PUT */
  const isNewAvatarFile = imageBody instanceof File;

  const reqBody: CreateUserData = {
    branchId: branchId,
    disabled: data?.disabled === 'true' ? true : false,
    email: data.email,
    firstName: data?.firstName,
    surname: data?.surname,
    middleName,
    userGroups,
    birthDate,
  };

  if (hasDriver) {
    reqBody.driver = {
      licenseCode: licenseCode,
      licenseClass: data?.licenseClass || [],
      licenseExpirationDate,
      licenseIssueDate,
    };
  }

  if (password) {
    reqBody.password = password;
  }

  if (phone) {
    reqBody.phone = phone;
  }

  if (birthDate) {
    reqBody.birthDate = birthDate;
  }

  const formData = new FormData();

  for (const keyReqData in reqBody) {
    if (Object.prototype.hasOwnProperty.call(reqBody, keyReqData)) {
      const value = reqBody[keyReqData];
      if (Array.isArray(value) && keyReqData !== 'userGroups') {
        value.forEach((item) => {
          formData.append(`${keyReqData}[]`, item);
        });
      } else if (keyReqData === 'userGroups') {
        value.forEach((item: any) => {
          formData.append(`${keyReqData}`, item);
        });
      } else if (typeof value === 'object' && value !== null) {
        const subKeys = Object.keys(value);
        subKeys.forEach((subKey) => {
          formData.append(`${keyReqData}.${subKey}`, (value as Record<string, string>)[subKey]);
        });
      } else {
        formData.append(keyReqData, value as string);
      }
    }
  }

  if (image && !userID && isNewAvatarFile) {
    formData.append('userPhotoDTO.hash', image.hash);
    formData.append('userPhotoDTO.image', image.image);
  }

  /** Новое фото в галерею: отправляется отдельным POST UsersApi.addPhoto, не дублируем в PUT */
  let userFoto: FormData | null = null;
  if (image && userID && isNewAvatarFile) {
    userFoto = new FormData();
    userFoto.append('image', image.image);
    userFoto.append('hash', image.hash || '');
    userFoto.append('userPhotoDTO.default', 'true');
  }

  /** Редактирование без нового файла: иначе бэк может выставить userPhotoDTO.default = false */
  if (image && userID && !isNewAvatarFile) {
    const keepDefault = image.photoDefault !== false;
    formData.append('userPhotoDTO.default', keepDefault ? 'true' : 'false');
    if (image.id != null) formData.append('userPhotoDTO.id', String(image.id));
    if (image.hash) formData.append('userPhotoDTO.hash', String(image.hash));
    if (image.fileName) formData.append('userPhotoDTO.fileName', image.fileName);
  }

  return { formData, userData: reqBody, userFoto };
};
