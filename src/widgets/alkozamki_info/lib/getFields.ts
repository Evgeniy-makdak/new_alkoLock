import type { TFunction } from 'i18next';

import type { ChipProps } from '@mui/material';

import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { IAlcolock } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const getFields = (itemData: IAlcolock, t?: TFunction) => {
  if (!itemData) return [];
  const tr = (key: string) => (t ? t(key) : key);

  const naming = itemData?.name ?? '-';
  const serialNumber = itemData?.serialNumber ?? '-';
  const car = Formatters.carNameFormatter(itemData?.vehicleBind?.vehicle);
  const carForCopy = Formatters.carNameFormatter(itemData?.vehicleBind?.vehicle, false, false);
  const name = Formatters.nameFormatter(itemData?.vehicleBind?.createdBy);
  const date = Formatters.formatISODate(itemData?.vehicleBind?.createdAt);
  const mode = itemData?.mode ?? '-';
  const modeLabel = mode.split(' ')[0];
  const normalizedMode = modeLabel.toLowerCase();
  const modeColor: ChipProps['color'] =
    normalizedMode === 'аварийный'
      ? 'error'
      : normalizedMode === 'сервисный'
        ? 'warning'
        : normalizedMode === 'рабочий'
          ? 'success'
          : 'default';

  return [
    {
      label: tr('tables.naming'),
      type: TypeOfRows.NAMING,
      value: {
        label: naming,
        copyble: naming === '-' ? false : true,
      },
    },
    {
      label: tr('tables.operatingMode'),
      type: TypeOfRows.MODE,
      value: {
        label: modeLabel,
        color: modeColor,
      },
    },
    {
      label: tr('tables.serialNumber'),
      type: TypeOfRows.SERIAL_NUMBER,
      value: {
        label: serialNumber,
        copyble: serialNumber === '-' ? false : true,
      },
    },
    {
      label: tr('tables.installedOnVehicle'),
      type: TypeOfRows.CAR,
      value: {
        copyText: carForCopy,
        label: car,
        copyble: car === '-' ? false : true,
      },
    },
    {
      label: tr('tables.whoLinked'),
      type: TypeOfRows.USER,
      value: {
        label: name,
        copyble: name === '-' ? false : true,
      },
    },
    {
      label: tr('tables.installationDate'),
      type: TypeOfRows.DATE,
      value: {
        label: date,
        copyble: date === '-' ? false : true,
      },
    },
  ];
};
