import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const getFields = (carData: ICar) => {
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
      label: 'Марка',
      type: TypeOfRows.MARK,
      value: { label: manufacturer ?? '-' },
    },
    {
      label: 'Модель',
      type: TypeOfRows.CAR,
      value: { label: carData?.model ?? '-' },
    },
    {
      label: 'VIN',
      type: TypeOfRows.SERIAL_NUMBER,
      value: { label: vin ?? '-', copyble: vin === '-' ? false : true },
    },
    {
      label: 'Государственный номер',
      type: TypeOfRows.GOS_NUMBER,
      value: { label: gosNumber, copyble: gosNumber === '-' ? false : true },
    },
    {
      label: 'Год выпуска',
      type: TypeOfRows.DATE,
      value: { label: year ?? '-' },
    },
    {
      label: 'Цвет',
      type: TypeOfRows.COLOR,
      value: { label: color },
    },
    {
      label: 'Тип',
      type: TypeOfRows.CATEGORY,
      value: { label: type },
    },
    {
      label: 'Дата регистрации',
      type: TypeOfRows.DATE,
      value: {
        label: Formatters.formatISODate(carData?.createdAt),
        copyble: dateRegistry === '-' ? false : true,
      },
    },
    {
      label: 'Установленный алкозамок',
      type: TypeOfRows.SERIAL_NUMBER,
      value: {
        label: carData && carData.monitoringDevice ? carData.monitoringDevice.serialNumber : '-',
        copyble: serialNumberAlko === '-' ? false : true,
      },
    },
  ];
};
