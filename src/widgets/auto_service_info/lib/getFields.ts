import type { TFunction } from 'i18next';

import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

const translateMode = (mode: string, t: TFunction): string => {
  const m = (mode || '').trim().toLowerCase();
  if (m === 'рабочий' || m === 'working' || m === 'work') return t('deviceMode.working');
  if (m === 'аварийный' || m === 'emergency') return t('deviceMode.emergency');
  if (m === 'сервисный' || m === 'service') return t('deviceMode.service');
  return mode || '-';
};

export const getFields = (itemData: IDeviceAction | null | undefined, t: TFunction) => {
  if (!itemData) return [];
  const naming = itemData?.device?.name ?? '-';
  const serialNumber = itemData?.device?.serialNumber ?? '-';
  const car = Formatters.carNameFormatter(itemData?.vehicleRecord);
  const carForCopy = Formatters.carNameFormatter(
    itemData?.device?.vehicleBind?.vehicle,
    false,
    false,
  );
  const name = Formatters.nameFormatter(itemData?.userAction);
  const date = Formatters.formatISODate(itemData?.device?.vehicleBind?.createdAt) ?? '-';
  const rawMode = itemData?.device?.mode ?? '-';
  const modeLabel = rawMode === '-' ? '-' : translateMode(rawMode, t);

  return [
    {
      label: t('tables.naming'),
      type: TypeOfRows.NAMING,
      value: { label: naming, copyble: naming === '-' ? false : true },
    },
    {
      label: t('tables.operatingMode'),
      type: TypeOfRows.MODE,
      value: {
        label: modeLabel,
      },
    },
    {
      label: t('tables.serialNumber'),
      type: TypeOfRows.SERIAL_NUMBER,
      value: { label: serialNumber, copyble: serialNumber === '-' ? false : true },
    },
    {
      label: t('tables.installedOnVehicle'),
      type: TypeOfRows.CAR,
      value: {
        label: car,
        copyText: carForCopy,
        copyble: car === '-' ? false : true,
      },
    },
    {
      label: t('tables.whoLinked'),
      type: TypeOfRows.USER,
      value: { label: name, copyble: name === '-' ? false : true },
    },
    {
      label: t('tables.installationDate'),
      type: TypeOfRows.DATE,
      value: { label: date, copyble: date === '-' ? false : true },
    },
  ];
};
