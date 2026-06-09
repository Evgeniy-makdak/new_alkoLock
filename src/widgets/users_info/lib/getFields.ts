import type { TFunction } from 'i18next';

import type { Field, GetTypeOfRowIconValueProps } from '@entities/info';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { IUser } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';
import {
  getLicenseExpirationChipProps,
  getLicenseExpirationStatus,
} from '@shared/utils/getLicenseExpirationStatus';

export const getFields = (userData: IUser, t?: TFunction): Field[] => {
  if (!userData) return [];
  const tr = (key: string) => (t ? t(key) : key);
  const numberPhone = userData?.phone;
  const email = userData?.email;
  const access = userData
    ? userData.disabled
      ? tr('tooltips.accessDenied')
      : tr('tooltips.accessAllowed')
    : '-';
  const numberVU = userData?.driver?.licenseCode;
  const name = Formatters.nameFormatter(userData);

  const role: GetTypeOfRowIconValueProps[] = (userData?.groupMembership || []).map((group) => {
    return {
      label: group.group.name,
      color: 'info',
    };
  });

  // Сортируем категории в алфавитном порядке
  const sortedLicenseClass = userData?.driver?.licenseClass
    ? [...userData.driver.licenseClass].sort((a, b) => a.localeCompare(b))
    : [];

  return [
    {
      label: tr('tables.user'),
      type: TypeOfRows.USER,
      value: {
        copyble: name === '-' ? false : true,
        label: name,
      },
    },
    {
      label: tr('info.dateOfBirth'),
      type: TypeOfRows.BIRTHDAY,
      value: { label: Formatters.convertDateFormat(userData?.birthDate) },
    },
    {
      label: tr('info.phoneNumber'),
      type: TypeOfRows.PHONE,
      value: { label: numberPhone ?? '-', copyble: numberPhone && true },
    },
    {
      label: tr('tables.mail'),
      type: TypeOfRows.EMAIL,
      value: { label: email ?? '-', copyble: email && true },
    },
    {
      label: tr('tables.roles'),
      type: TypeOfRows.ROLE,
      value: role.length
        ? role
        : {
            label: '-',
          },
    },
    {
      label: tr('tables.access'),
      type: TypeOfRows.ACCESS,

      value: {
        color: userData?.disabled ? 'error' : 'success',
        label: access,
      },
    },
    {
      label: tr('info.licenseNumber'),
      type: TypeOfRows.NUMBER_VU,
      value: { label: numberVU ?? '-', copyble: numberVU && true },
    },
    {
      label: tr('info.issueDate'),
      type: TypeOfRows.DATE,
      value: { label: Formatters.convertDateFormat(userData?.driver?.licenseIssueDate) },
    },
    {
      label: tr('info.expiration'),
      type: TypeOfRows.DATE,
      value: {
        label: Formatters.convertDateFormat(userData?.driver?.licenseExpirationDate),
        ...getLicenseExpirationChipProps(
          getLicenseExpirationStatus(userData?.driver?.licenseExpirationDate),
        ),
      },
    },
    {
      label: tr('info.categories'),
      type: TypeOfRows.CATEGORY,
      value: {
        label: sortedLicenseClass.length ? sortedLicenseClass.join(', ') : '-',
      },
    },
  ];
};
