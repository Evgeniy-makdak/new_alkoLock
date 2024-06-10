import type { FormState, UseFormWatch } from 'react-hook-form';

import dayjs from 'dayjs';

import { AppConstants } from '@app/index';
import type { ImageState } from '@entities/upload_img';
import type { ID, IUser } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { FilesUtils } from '@shared/utils/FilesUtils';

import type { Form } from './validate';

export const getFormState = (
  formState: FormState<Form>,
  watch: UseFormWatch<{
    disabled?: ID;
    firstName?: string;
    surName?: string;
    lastName?: string;
    birthDate?: dayjs.Dayjs;
    phone?: string;
    email?: string;
    password?: string;
    userGroups?: Values;
    licenseCode?: string;
    licenseIssueDate?: dayjs.Dayjs;
    licenseExpirationDate?: dayjs.Dayjs;
    licenseClass?: string[];
    userPhotoDTO?: ImageState[];
  }>,
) => {
  const {
    firstName,
    surName,
    lastName,
    email,
    password,
    userGroups: userGroupsError,
    licenseCode: licenseCodeError,
    licenseIssueDate: licenseIssueDateError,
    licenseExpirationDate: licenseExpirationDateError,
    phone: phoneError,
    licenseClass: licenseClassError,
  } = formState.errors;

  const errorFirstName = firstName ? firstName.message.toString() : '';
  const errorsurName = surName ? surName.message.toString() : '';
  const errorLastName = lastName ? lastName.message.toString() : '';
  const errorEmail = email ? email.message.toString() : '';
  const errorPassword = password ? password.message.toString() : '';
  const errorUserGroups = userGroupsError ? userGroupsError.message.toString() : '';
  const errorLicenseCode = licenseCodeError ? licenseCodeError.message.toString() : '';
  const errorPhone = phoneError ? phoneError.message.toString() : '';
  const errorLicenseIssueDate = licenseIssueDateError
    ? licenseIssueDateError.message.toString()
    : '';
  const errorLicenseExpirationDate = licenseExpirationDateError
    ? licenseExpirationDateError.message.toString()
    : '';
  const errorLicenseClass = licenseClassError ? licenseClassError.message?.toString() : '';

  const userGroups = watch('userGroups');
  const disableDriverInfo = watch('licenseCode')?.trim().length === 0;
  const licenseClass = watch('licenseClass') || [];
  const licenseIssueDate = watch('licenseIssueDate');
  const licenseExpirationDate = watch('licenseExpirationDate');
  const licenseCode = watch('licenseCode');
  const phone = watch('phone');
  const birthDate = watch('birthDate');
  const disabled = watch('disabled');
  const images = watch('userPhotoDTO');

  const state = {
    state: {
      phone,
      birthDate,
      disabled,
      licenseIssueDate,
      licenseExpirationDate,
      userGroups,
      licenseClass,
      licenseCode,
      images,
      disableDriverInfo,
    },
    errors: {
      errorLicenseClass,
      errorFirstName,
      errorLastName,
      errorsurName,
      errorUserGroups,
      errorLicenseCode,
      errorLicenseIssueDate,
      errorLicenseExpirationDate,
      errorPhone,
      errorPassword,
      errorEmail,
    },
  };
  return state;
};

export const getInitFormState = (
  isLoading: boolean,
  values: Values,
  userId?: ID,
  user?: IUser,
  avatar?: {
    img: Blob;
    hash: string;
  } | null,
) => {
  const accessList = AppConstants.accessList.map((val) => ({
    value: `${val.value}`,
    label: val.label,
  }));

  const src = FilesUtils.getUrlFromBlob(avatar?.img);
  const initialAvatar: ImageState[] =
    avatar && !isLoading ? [{ src: src, image: avatar?.img, hash: avatar?.hash }] : [];

  const birthDateInit = user && user?.birthDate ? dayjs(user?.birthDate) : null;
  const disabledInit = `${user ? accessList.find((item) => item.value === `${user?.disabled}`)?.value : false}`;
  const licenseIssueDateInit =
    user && user?.driver?.licenseIssueDate ? dayjs(user?.driver?.licenseIssueDate) : null;

  const licenseExpirationDateInit =
    user && user?.driver?.licenseExpirationDate ? dayjs(user?.driver?.licenseExpirationDate) : null;

  const canSetDefaultValue = !isLoading && user && userId;
  const defaultValues: Form = {
    firstName: canSetDefaultValue ? user?.firstName : '',
    surName: canSetDefaultValue ? user?.surName : '',
    lastName: canSetDefaultValue ? user?.lastName : '',
    birthDate: birthDateInit,
    phone: canSetDefaultValue ? user?.phone : '',
    disabled: disabledInit,
    email: canSetDefaultValue ? user?.email : '',
    password: '',
    licenseExpirationDate: licenseExpirationDateInit,
    licenseIssueDate: licenseIssueDateInit,
    licenseClass: canSetDefaultValue ? user?.driver?.licenseClass : [],
    licenseCode: user && user?.driver?.licenseCode ? user?.driver?.licenseCode : '',
    userGroups: values,
    userPhotoDTO: [],
  };

  return { defaultValues: defaultValues, initialAvatar, accessList };
};
