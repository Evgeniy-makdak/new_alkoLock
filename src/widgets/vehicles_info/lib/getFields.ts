import { AppConstants } from '@app/index';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const getFields = (carData: ICar) => {
  const vin = carData?.vin ?? '-';
  const gosNumber = carData?.registrationNumber ?? '-';
  const dateRegistry = Formatters.formatISODate(carData?.createdAt);

  return [
    {
      label: 'Марка',
      type: TypeOfRows.MARK,
      value: { label: carData?.manufacturer ?? '-' },
    },
    {
      label: 'Модель',
      type: TypeOfRows.CAR,
      value: { label: carData?.model ?? '-' },
    },
    {
      label: 'VIN',
      type: TypeOfRows.SERIAL_NUMBER,
      value: { label: carData?.vin ?? '-', copyble: vin === '-' ? false : true },
    },
    {
      label: 'Государственный номер',
      type: TypeOfRows.GOS_NUMBER,
      value: { label: gosNumber, copyble: gosNumber === '-' ? false : true },
    },
    {
      label: 'Год выпуска',
      type: TypeOfRows.DATE,
      value: { label: carData?.year ?? '-' },
    },
    {
      label: 'Цвет',
      type: TypeOfRows.COLOR,
      value: {
        label:
          AppConstants.carColorsList.find((color) => color.value === carData?.color)?.label ?? '-',
      },
    },
    {
      label: 'Тип',
      type: TypeOfRows.CATEGORY,
      value: {
        label: AppConstants.carTypesList.find((type) => type.value === carData?.type)?.label ?? '-',
      },
    },
    {
      label: 'Дата регистрации',
      type: TypeOfRows.DATE,
      value: {
        label: Formatters.formatISODate(carData?.createdAt),
        copyble: dateRegistry === '-' ? false : true,
      },
    },
  ];
};
