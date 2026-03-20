/* eslint-disable */
import type { TFunction } from 'i18next';

import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const getFields = (carData: ICar, t?: TFunction) => {
  const tr = (key: string) => (t ? t(key) : key);
  const vin = carData?.vin;
  const gosNumber = carData?.registrationNumber;
  const dateRegistry = Formatters.formatISODate(carData?.createdAt);
  const serialNumberAlko = carData?.registrationNumber;
  const manufacturer = carData?.manufacturer;
  const year = carData?.year;
  const color = carData?.color;
  const type = carData?.type;

  return [
    {
      label: tr('tables.mark'),
      type: TypeOfRows.MARK,
      value: { label: manufacturer ?? '-' },
    },
    {
      label: tr('tables.model'),
      type: TypeOfRows.CAR,
      value: { label: carData?.model ?? '-' },
    },
    {
      label: 'VIN',
      type: TypeOfRows.SERIAL_NUMBER,
      value: { label: vin ?? '-', copyble: vin === '-' ? false : true },
    },
    {
      label: tr('tables.stateNumber'),
      type: TypeOfRows.GOS_NUMBER,
      value: { label: gosNumber, copyble: gosNumber === '-' ? false : true },
    },
    {
      label: tr('tables.yearOfManufacture'),
      type: TypeOfRows.DATE,
      value: { label: year ?? '-' },
    },
    {
      label: tr('form.color'),
      type: TypeOfRows.COLOR,
      value: { label: color ?? '-' },
    },
    {
      label: tr('form.type'),
      type: TypeOfRows.CATEGORY,
      value: { label: type ?? '-' },
    },
    {
      label: tr('tables.registrationDate'),
      type: TypeOfRows.DATE,
      value: {
        label: Formatters.formatISODate(carData?.createdAt),
        copyble: dateRegistry === '-' ? false : true,
      },
    },
    {
      label: tr('tables.installedAlcolock'),
      type: TypeOfRows.SERIAL_NUMBER,
      value: {
        label: carData && carData.monitoringDevice ? carData.monitoringDevice.serialNumber : '-',
        copyble: serialNumberAlko === '-' ? false : true,
      },
    },
  ];
};
