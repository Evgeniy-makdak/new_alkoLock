import { AppConstants } from '@app/index';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';
import type { VehicleColor } from '@shared/types/ColorTypes';

export const getFields = (carData: ICar, vehicleColors: VehicleColor[]) => {
  const vin = carData?.vin ?? '-';
  const gosNumber = carData?.registrationNumber ?? '-';
  const dateRegistry = Formatters.formatISODate(carData?.createdAt);
  const serialNumberAlko = carData?.registrationNumber;

  console.log('Vehicle Colors in getFields:', vehicleColors); // Проверка данных

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
        label: vehicleColors?.find((color) => color.value === carData?.color)?.label ?? '-',
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
