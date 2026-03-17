/* eslint-disable prettier/prettier */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TFunction } from 'i18next';

import type { Field } from '@entities/info';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';

export const getAdditionFields = (
  data?: IDeviceAction | null | undefined,
  t?: TFunction,
): Field[] => {
  if (!data) return [];
  const tr = (key: string) => (t ? t(key) : key);

  const fields: Array<Field | null> = [
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.analyzerId'),
          type: TypeOfRows.HEADER,
          value: {
            label: `${data?.summary?.deviceId ?? '-'}`,
            color: 'default',
          },
          tooltip: tr('info.analyzerId'),
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.temperatureSensor'),
          type: TypeOfRows.TEMPERATURE,
          value: {
            label: `${data?.summary?.temperature ?? '-'} ℃`,
            color: 'default',
          },
          tooltip: tr('info.temperatureSensor'),
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.waterTableType'),
          type: TypeOfRows.HEADER,
          value: {
            label: `${data?.summary?.waterTableType ?? '-'}`,
            color: 'default',
          },
          tooltip: tr('info.waterTableType'),
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.cuvetteCapacity'),
          type: TypeOfRows.HEADER,
          value: {
            label: `${data?.summary?.cuvetteCapacity ?? '-'}`,
            color: 'default',
          },
          tooltip: tr('info.cuvetteCapacity'),
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.zeroCalibration'),
          type: TypeOfRows.HEADER,
          value: {
            label: `${data?.summary?.zeroCalibration ?? '-'}`,
            color: 'default',
          },
          tooltip: tr('info.zeroCalibration'),
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.waterTableRatioA'),
          type: TypeOfRows.HEADER,
          value: {
            label: `${data?.summary?.waterTableRatioA ?? '-'}`,
            color: 'default',
          },
          tooltip: tr('info.waterTableRatioA'),
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.analyzerFirmwareVersion'),
          type: TypeOfRows.HEADER,
          value: {
            label: `${data?.summary?.deviceFirmwareVersion ?? '-'}`,
            color: 'default',
          },
          tooltip: tr('info.analyzerFirmwareVersion'),
        }
      : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.sensitivityCoefficient'),
          type: TypeOfRows.HEADER,
          value: {
            label: `${data?.summary?.sensitivityCoefficient ?? '-'}`,
            color: 'default',
          },
          tooltip: tr('info.sensitivityCoefficient'),
        }
      : null,
  ];

  return fields.filter((item): item is Field => item !== null);
};
