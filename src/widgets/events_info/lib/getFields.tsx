import type { Field, TypeSummaryExhaleResult } from '@entities/info';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import { testids } from '@shared/const/testid';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { MapLink } from '@shared/ui/map_link';
import { Formatters } from '@shared/utils/formatters';

export const getFields = (data?: IDeviceAction | null | undefined): Field[] => {
  if (!data) return [];

  const car = data?.vehicleRecord;
  const carString = Formatters.carNameFormatter(car);
  const carForCopy = Formatters.carNameFormatter(car, false, false);
  const exhaleError = (data.summary?.exhaleError || data?.summary?.result) as TypeSummaryExhaleResult;

  const name = Formatters.nameFormatter(data?.userAction) || '';
  const stateErrorCode = data?.summary?.stateErrorCode;
  const stateError = data?.summary?.stateError;

  // Проверяем, есть ли координаты в summary или в events
  const latitude = data?.summary?.lat || data?.events?.[0]?.latitude; // Проверка для summary и events
  const longitude = data?.summary?.lon || data?.events?.[0]?.longitude; // Проверка для summary и events
  const longitudeExists = !!latitude && !!longitude;

  const fields: Field[] = [
    {
      label: 'Пользователь',
      type: TypeOfRows.USER,
      value: {
        copyble: true,
        label: name,
      },
    },
    carString !== '-'
      ? {
          label: 'Транспортное средство',
          type: TypeOfRows.CAR,
          value: {
            copyText: carForCopy,
            copyble: true,
            label: carString,
          },
        }
      : null,
    {
      label: 'Серийный номер алкозамка',
      type: TypeOfRows.SERIAL_NUMBER,
      value: {
        copyble: true,
        label: data?.device.serialNumber || '',
      },
    },
    stateErrorCode
      ? {
          label: 'Код ошибки',
          type: TypeOfRows.CODE_ERROR,
          value: {
            color: 'error',
            label: data.summary.stateErrorCode || 400,
            copyble: true,
          },
        }
      : null,
    stateError
      ? {
          label: 'Ошибка',
          type: TypeOfRows.ERROR,
          value: {
            label: data.summary?.stateError?.replace('ALCOLOCK_STATE_', ''),
            color: 'error',
          },
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: 'Количественный результат',
          type: TypeOfRows.MG_ON_LITER,
          value: {
            label: `${data?.summary?.testResult ?? '-'} мг/л`,
            color: 'default',
          },
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: 'Качественный результат',
          type: TypeOfRows.RESULT,
          summaryExhaleResult: exhaleError || 'DEVICE_TEST_ERROR_INTERRUPTED',
        }
      : null,
    {
      label: 'Координаты',
      type: TypeOfRows.COORDS,
      value: {
        clickable: true,
        label: longitudeExists ? (
          <MapLink
            testid={testids.page_events.events_widget_info.EVENTS_WIDGET_INFO_MAPLINK}
            latitude={latitude}
            longitude={longitude}
          />
        ) : (
          '-'
        ),
      },
    },
  ];

  return fields.filter((item) => item !== null);
};
