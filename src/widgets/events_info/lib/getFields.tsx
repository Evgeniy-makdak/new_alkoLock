/* eslint-disable prettier/prettier */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TFunction } from 'i18next';

import { Chip, Tooltip } from '@mui/material';

import type { Field, TypeSummaryExhaleResult } from '@entities/info';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import { testids } from '@shared/const/testid';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { MapLink } from '@shared/ui/map_link';
import { Formatters } from '@shared/utils/formatters';

import { AdaptiveTitle } from './AdaptiveTitle';

export const getFields = (data?: IDeviceAction | null | undefined, t?: TFunction): Field[] => {
  if (!data) return [];
  const tr = (key: string) => (t ? t(key) : key);
  const car = data?.vehicleRecord;

  const errorEvent = data?.events?.find((event) => event.eventType?.startsWith('Ошибка'));

  let eventType = 'Тестирование';
  if (data?.events?.some((event: any) => event.eventType === 'Тестирование')) {
    eventType = 'Тестирование';
  } else if (errorEvent) {
    eventType = errorEvent.eventType;
  } else if (data?.events?.length > 0) {
    eventType = data.events[0].eventType;
  }

  const carString = Formatters.carNameFormatter(car);
  const carForCopy = Formatters.carNameFormatter(car, false, false);
  const exhaleError = (data.summary?.exhaleError ||
    data?.summary?.result) as TypeSummaryExhaleResult;

  const time = Formatters.formatISODate(data?.occurredAt) || '';
  const name = Formatters.nameFormatter(data?.userAction) || '';
  const hasTestingEvent = data?.events?.some((event: any) => event.eventType === 'Тестирование');
  const latitude = data?.summary?.lat || data?.events?.[0]?.latitude;
  const longitude = data?.summary?.lon || data?.events?.[0]?.longitude;
  const firstEvent = data?.events?.[0] as any;
  const registrationNumber =
    data?.vehicleRecord?.registrationNumber ?? firstEvent?.vehicleRecord?.registrationNumber;
  const longitudeExists = !!latitude && !!longitude;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // const hasDeviceError = data?.events?.some((event) => String(event.eventType).includes('Ошибка'));

  const multiLineTextStyle: React.CSSProperties = {
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    maxWidth: '100%',
    fontSize: '16px',
  };

  const additionalFields: Field[] = [
    !hasTestingEvent && data?.summary?.description?.connectionError
      ? {
          label: tr('info.source'),
          type: TypeOfRows.HEADER,
          value: { copyble: false, label: data?.summary?.description?.connectionError },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.codeError
      ? {
          label: tr('info.errorCode'),
          type: TypeOfRows.HEADER,
          value: { copyble: false, label: data?.summary?.description?.codeError },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.request
      ? {
          label: tr('info.errorOrigin'),
          type: TypeOfRows.HEADER,
          value: {
            copyble: true,
            customStyled: true,
            copyText: data?.summary?.description?.request,
            label: <span style={multiLineTextStyle}>{data?.summary?.description?.request}</span>,
          },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.responseATString
      ? {
          label: 'Код ответа блока интеграции',
          type: TypeOfRows.HEADER,
          value: {
            copyble: true,
            customStyled: true,
            copyText: data?.summary?.description?.responseATString,
            label: (
              <span style={multiLineTextStyle}>{data?.summary?.description?.responseATString}</span>
            ),
          },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.responseToRequest
      ? {
          label: tr('info.errorDescription'),
          type: TypeOfRows.HEADER,
          value: {
            copyble: true,
            customStyled: true,
            copyText: data?.summary?.description?.responseToRequest,
            label: (
              <span style={multiLineTextStyle}>
                {data?.summary?.description?.responseToRequest}
              </span>
            ),
          },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.mobileDevice
      ? {
          label: tr('info.mobileDevice'),
          type: TypeOfRows.HEADER,
          value: { copyble: false, label: data?.summary?.description?.mobileDevice },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.osVersion
      ? {
          label: tr('info.osVersion'),
          type: TypeOfRows.HEADER,
          value: { copyble: false, label: data?.summary?.description?.osVersion },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.mpoVersion
      ? {
          label: tr('info.mobileAppVersion'),
          type: TypeOfRows.HEADER,
          value: { copyble: false, label: data?.summary?.description?.mpoVersion },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.biVersion
      ? {
          label: tr('info.integrationFirmwareVersion'),
          type: TypeOfRows.HEADER,
          value: { copyble: false, label: data?.summary?.description?.biVersion },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.deviceId
      ? {
          label: tr('info.analyzerId'),
          type: TypeOfRows.HEADER,
          value: { copyble: false, label: data?.summary?.description?.deviceId },
        }
      : null,
    !hasTestingEvent && data?.summary?.description?.deviceFirmwareVersion
      ? {
          label: tr('info.analyzerFirmwareVersion'),
          type: TypeOfRows.HEADER,
          value: { copyble: false, label: data?.summary?.description?.deviceFirmwareVersion },
        }
      : null,
  ].filter((item) => item !== null);

  const hasAdditionalInfo = additionalFields.length > 0;

  const eventTypeElement = (
    <Tooltip title={eventType || ''} arrow>
      <Chip
        label={eventType}
        sx={{
          maxWidth: '100%',
          whiteSpace: 'nowrap',
          height: '32px',
          fontSize: '16px',
          '& .MuiChip-label': {
            display: 'block',
            whiteSpace: 'nowrap',
            padding: '6px 12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          backgroundColor: 'rgba(0, 0, 0, 0.08)',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
          },
        }}
      />
    </Tooltip>
  );

  const fields: Field[] = [
    {
      label: tr('info.dateTime'),
      type: TypeOfRows.DATE,
      value: {
        copyble: false,
        customStyled: true,
        label: time,
      },
    },
    {
      label: tr('info.eventType'),
      type: TypeOfRows.STATUS,
      value: {
        copyble: false,
        ...(isMobile
          ? {
              label: eventType,
              tooltip: true,
            }
          : {
              element: eventTypeElement,
            }),
      },
    },
    {
      label: tr('info.user'),
      type: TypeOfRows.USER,
      value: {
        copyble: true,
        customStyled: true,
        label: name,
      },
    },
    carString !== '-'
      ? {
          label: tr('info.vehicle'),
          type: TypeOfRows.CAR,
          value: {
            copyText: carForCopy,
            copyble: true,
            label: carString,
          },
        }
      : null,
    {
      label: tr('info.alcolockSerialNumber'),
      type: TypeOfRows.SERIAL_NUMBER,
      value: {
        copyble: true,
        label: data?.device.serialNumber || '',
      },
    },
    // data?.type === 'SOBRIETY_TEST'
    //   ? {
    //       label: 'Количественный результат',
    //       type: TypeOfRows.MG_ON_LITER,
    //       value: {
    //         label: `${data?.summary?.testResult ?? '-'} мг/л`,
    //         color: 'default',
    //       },
    //     }
    //   : null,
    data?.type === 'SOBRIETY_TEST'
      ? {
          label: tr('info.qualitativeResult'),
          type: TypeOfRows.RESULT,
          summaryExhaleResult:
            exhaleError || 'DEVICE_TEST_ERROR_INTERRUPTED' || 'TEST_FALSIFICATION',
        }
      : null,
    {
      label: tr('info.coordinates'),
      type: TypeOfRows.COORDS,
      value: {
        clickable: true,
        label: longitudeExists ? (
          <MapLink
            testid={testids.page_events.events_widget_info.EVENTS_WIDGET_INFO_MAPLINK}
            latitude={latitude}
            longitude={longitude}
            vehicle={registrationNumber}
          />
        ) : (
          '-'
        ),
      },
    },
    hasAdditionalInfo
      ? ({
          label: <AdaptiveTitle title={tr('info.additionalInfo')} />,
          value: {
            style: { visibility: 'hidden' },
          },
        } as any)
      : null,
    ...additionalFields,
  ];

  return fields.filter((item) => item !== null);
};
