/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { Stack } from '@mui/material';

import { Image } from '@entities/image';
import { Info } from '@entities/info';
import { Loader } from '@shared/ui/loader';

import { useEventInfo } from '../hooks/useEventInfo';

interface EventInfoProps {
  selectedEventId: string | number;
  onHasDeviceErrorChange?: (hasError: boolean) => void;
  isAdditionalDataTab?: boolean;
  onHasTemperatureSensor?: (hasSensor: boolean) => void; // Новый пропс
}

export const EventInfo = ({
  selectedEventId,
  onHasDeviceErrorChange,
  isAdditionalDataTab = false,
  onHasTemperatureSensor,
}: EventInfoProps) => {
  const { data, isLoading, fields, hasTemperatureSensor } = useEventInfo(selectedEventId);
  const hasDeviceError = data?.events[0]?.eventType?.startsWith('Ошибка') || false;

  useEffect(() => {
    onHasDeviceErrorChange?.(hasDeviceError);
    onHasTemperatureSensor?.(hasTemperatureSensor); // Передаем информацию о датчике
  }, [hasDeviceError, hasTemperatureSensor]);

  return (
    <Loader isLoading={isLoading}>
      <Stack overflow={'auto'} padding={2}>
        {!isAdditionalDataTab && data?.summary?.photoFileName && (
          <Stack alignItems={'center'} justifyContent={'center'} width="100%" minHeight={410}>
            <Image url={data.summary.photoFileName} />
          </Stack>
        )}
        <Info fields={fields} />
      </Stack>
    </Loader>
  );
};
