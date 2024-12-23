import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const getFields = (itemData: IDeviceAction | null | undefined) => {
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

  return [
    {
      label: 'Наименование',
      type: TypeOfRows.NAMING,
      value: { label: naming, copyble: naming === '-' ? false : true },
    },
    {
      label: 'Режим работы',
      type: TypeOfRows.MODE,
      value: {
        label: itemData?.device?.mode ?? '-',
      },
    },
    {
      label: 'Серийный номер',
      type: TypeOfRows.SERIAL_NUMBER,
      value: { label: serialNumber, copyble: serialNumber === '-' ? false : true },
    },
    {
      label: 'Установлен на ТС',
      type: TypeOfRows.CAR,
      value: {
        label: car,
        copyText: carForCopy,
        copyble: car === '-' ? false : true,
      },
    },
    {
      label: 'Кем привязан',
      type: TypeOfRows.USER,
      value: { label: name, copyble: name === '-' ? false : true },
    },
    {
      label: 'Дата установки на ТС',
      type: TypeOfRows.DATE,
      value: { label: date, copyble: date === '-' ? false : true },
    },
  ];
};
