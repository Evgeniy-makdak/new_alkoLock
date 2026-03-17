/* eslint-disable prettier/prettier */

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { Tooltip } from '@mui/material';

import { Info } from '@entities/info';
import { Loader } from '@shared/ui/loader';

// Добавляем импорт Tooltip
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

  // Модифицируем fields, чтобы добавить Tooltip к label
  const enhancedFields = fields.map((field) => ({
    ...field,
    label: (
      <Tooltip title={field.tooltip || field.label} arrow placement="top-start">
        <span>{field.label}</span>
      </Tooltip>
    ),
  }));

  return (
    <Loader isLoading={isLoading}>
      <Info fields={enhancedFields} />
    </Loader>
  );
};
