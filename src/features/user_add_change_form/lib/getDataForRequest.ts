import { CreateUserData, ID } from '@shared/types/BaseQueryTypes';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { Form } from './validate';

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
  const birthDate = data?.birthDate?.format('YYYY-MM-DD');
  const hasDriver = Boolean(licenseCode);
  const licenseExpirationDate = hasDriver
    ? data?.licenseExpirationDate?.format('YYYY-MM-DD')
    : null;
  const licenseIssueDate = hasDriver ? data?.licenseIssueDate?.format('YYYY-MM-DD') : null;
  const image = data?.userPhotoDTO?.length > 0 ? data?.userPhotoDTO[0] : null;

  const reqBody: CreateUserData = {
    branchId: branchId,
    disabled: data?.disabled === 'true' ? true : false,
    email: data.email,
    firstName: data?.firstName,
    surname: data?.surname,
    middleName,
    userGroups,
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

  if (image && !userID) {
    formData.append('userPhotoDTO.hash', image.hash);
    formData.append('userPhotoDTO.image', image.image);
  }

  let userFoto: FormData | null = null;
  if (image && userID) {
    userFoto = new FormData();
    userFoto.append('image', image?.image || '');
    userFoto.append('hash', image?.hash || '');
  }

  return { formData, userData: reqBody, userFoto };
};
