import type { CreateUserData, ID } from '@shared/types/BaseQueryTypes';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { type Form } from './validate';

export const getDataForRequest = (
  data: Form,
  branchId: ID,
  userID: ID,
): { formData?: FormData | null; userData?: CreateUserData | null; userFoto?: FormData | null } => {
  const userGroups = data?.userGroups;
  const userGroupsIds = ArrayUtils.getArrayFromValues(userGroups);
  const licenseCode = data?.licenseCode || '';
  const phone = data?.phone?.trim();
  const lastName = data?.lastName || '';
  const password = data?.password;
  const birthDate = data?.birthDate?.format('YYYY-MM-DD');
  const hasDriver = Boolean(licenseCode);
  const licenseExpirationDate =
    hasDriver && data?.licenseExpirationDate
      ? data?.licenseExpirationDate?.format('YYYY-MM-DD')
      : null;
  const licenseIssueDate =
    hasDriver && data?.licenseIssueDate ? data?.licenseIssueDate?.format('YYYY-MM-DD') : null;
  const image = data?.userPhotoDTO?.length > 0 ? data?.userPhotoDTO[0] : null;

  const reqBody: CreateUserData = {
    branchId: branchId,
    disabled: data?.disabled === 'true' ? true : false,
    email: data.email,
    firstName: data?.firstName,
    middleName: data?.middleName,
    lastName,
    userGroups: userGroupsIds,
  };
  if (hasDriver) {
    reqBody.driver = {
      licenseCode: licenseCode,
      licenseClass: data?.licenseClass || [],
      licenseExpirationDate: licenseExpirationDate,
      licenseIssueDate: licenseIssueDate,
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
  const formFoto = new FormData();

  if (image && !userID) {
    reqBody.userPhotoDTO = {
      hash: image.hash,
      image: image.image,
    };
  } else if (userID) {
    formFoto.append('image', image?.image || null);
    formFoto.append('hash', image?.hash || null);
  }
  if (userID) return { userData: reqBody, userFoto: image ? formFoto : null };

  const formData = new FormData();
  for (const keyReqData in reqBody) {
    if (keyReqData === 'userGroups') {
      const arr = reqBody[keyReqData];
      arr.map((item) => {
        formData.append('userGroups[]', typeof item === 'string' ? item : `${item}`);
      });
    } else if (keyReqData === 'driver') {
      const driver = reqBody[keyReqData];
      for (const keyDriver in driver) {
        if (keyDriver === 'licenseClass') {
          const arrClass = driver[keyDriver];
          arrClass.map((driveClass) => {
            formData.append(`driver[${keyDriver}][]`, driveClass);
          });
        } else {
          const nextDriverData = driver[keyDriver as keyof typeof driver];
          formData.append(`driver[${keyDriver}]`, nextDriverData as string);
        }
      }
    } else if (keyReqData === 'userPhotoDTO') {
      const userPhotoDTOFormData = reqBody?.userPhotoDTO;
      if (!userPhotoDTOFormData?.hash) continue;

      formData.append('userPhotoDTO.hash', userPhotoDTOFormData?.hash);
      formData.append('userPhotoDTO.image', userPhotoDTOFormData?.image);
    } else {
      const nextData = reqBody[keyReqData as keyof typeof reqBody];
      formData.append(keyReqData, nextData as string);
    }
  }
  return { formData: formData };
};
