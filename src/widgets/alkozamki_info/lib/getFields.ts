import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { IAlcolock } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const getFields = (itemData: IAlcolock) => {
  if (!itemData) return [];

  const naming = itemData?.name ?? '-';
  const serialNumber = itemData?.serialNumber ?? '-';
  const car = Formatters.carNameFormatter(itemData?.vehicleBind?.vehicle);
  const carForCopy = Formatters.carNameFormatter(itemData?.vehicleBind?.vehicle, false, false);
  const name = Formatters.nameFormatter(itemData?.vehicleBind?.createdBy);
  const date = Formatters.formatISODate(itemData?.vehicleBind?.createdAt);
  const mode = itemData?.mode ?? '-';

  return [
    {
      label: 'Наименование',
      type: TypeOfRows.NAMING,
      value: {
        label: naming,
        copyble: naming === '-' ? false : true,
      },
    },
    {
      label: 'Режим работы',
      type: TypeOfRows.MODE,
      value: {
        label: mode.split(' ')[0],
      },
    },
    {
      label: 'Серийный номер',
      type: TypeOfRows.SERIAL_NUMBER,
      value: {
        label: serialNumber,
        copyble: serialNumber === '-' ? false : true,
      },
    },
    {
      label: 'Установлен на ТС',
      type: TypeOfRows.CAR,
      value: {
        copyText: carForCopy,
        label: car,
        copyble: car === '-' ? false : true,
      },
    },
    {
      label: 'Кем привязан',
      type: TypeOfRows.USER,
      value: {
        label: name,
        copyble: name === '-' ? false : true,
      },
    },
    {
      label: 'Дата установки на ТС',
      type: TypeOfRows.DATE,
      value: {
        label: date,
        copyble: date === '-' ? false : true,
      },
    },
  ];
};
