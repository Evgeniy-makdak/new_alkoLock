/* eslint-disable prettier/prettier */

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { Info } from '@entities/info';
import { Loader } from '@shared/ui/loader';

import { useAdditionInfo } from '../hooks/useAdditionInfo';

interface EventInfo {
  selectedEventId: string | number;
  onHasDeviceErrorChange?: (hasError: boolean) => void;
  onHasTemperatureSensor?: (hasSensor: boolean) => void;
}

export const AdditionInfo = ({
  selectedEventId,
  onHasDeviceErrorChange,
  onHasTemperatureSensor,
}: EventInfo) => {
  const { data, isLoading, fields } = useAdditionInfo(selectedEventId);

  const hasDeviceError = data?.events[0]?.eventType?.startsWith('Ошибка') || false;

  useEffect(() => {
    onHasDeviceErrorChange?.(hasDeviceError);
    const hasSensor = fields.some((field) => field.type === 'TEMPERATURE');
    onHasTemperatureSensor?.(hasSensor);
  }, [hasDeviceError, fields]);

  // OverflowTooltip на label-чипах (Info / getTypeOfRowIconLabel) —
  // тултип только при обрезке текста, без постоянного Tooltip.
  return (
    <Loader isLoading={isLoading}>
      <Info fields={fields} />
    </Loader>
  );
};
