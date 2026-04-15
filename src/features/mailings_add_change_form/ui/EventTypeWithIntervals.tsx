import React from 'react';
import { useTranslation } from 'react-i18next';

import { Delete } from '@mui/icons-material';
import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';

import { type TimeInterval, TimeIntervalInput } from './TimeIntervalInput';

export interface EventTypeWithIntervalsData {
  id: string;
  eventType: string;
  timeIntervals: TimeInterval[];
}

interface EventTypeWithIntervalsProps {
  eventTypeData: EventTypeWithIntervalsData;
  index: number;
  eventTypeOptions: string[];
  eventTypesWithIntervals: EventTypeWithIntervalsData[];
  onChange: (eventTypes: EventTypeWithIntervalsData[]) => void;
  onRemove: (id: string) => void;
  showRemoveButton: boolean;
  errors?: {
    eventType?: string;
    timeIntervals?: string;
  };
}

export const EventTypeWithIntervals: React.FC<EventTypeWithIntervalsProps> = ({
  eventTypeData,
  index,
  eventTypeOptions,
  eventTypesWithIntervals,
  onChange,
  onRemove,
  showRemoveButton,
  errors,
}) => {
  const { t } = useTranslation();
  // Доступные опции для выбора (исключаем уже выбранные типы событий)
  const availableEventTypes = eventTypeOptions.filter(
    (option) =>
      !eventTypesWithIntervals.some((et) => et.eventType === option && et.id !== eventTypeData.id),
  );

  const handleEventTypeChange = (newEventType: string | null) => {
    const updated = eventTypesWithIntervals.map((item) =>
      item.id === eventTypeData.id ? { ...item, eventType: newEventType || '' } : item,
    );
    onChange(updated);
  };

  const handleTimeIntervalsChange = (timeIntervals: TimeInterval[]) => {
    const updated = eventTypesWithIntervals.map((item) =>
      item.id === eventTypeData.id ? { ...item, timeIntervals } : item,
    );
    onChange(updated);
  };

  // Проверяем, установлен ли интервал на весь день (00:00 - 23:59)
  const isAllDayInterval =
    eventTypeData.timeIntervals.length === 1 &&
    eventTypeData.timeIntervals[0].startTime === '00:00' &&
    eventTypeData.timeIntervals[0].endTime === '23:59';

  const handleAllDayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;

    if (isChecked) {
      // Устанавливаем интервал на весь день
      const allDayInterval: TimeInterval = {
        id: `all-day-${Date.now()}`,
        startTime: '00:00',
        endTime: '23:59',
      };
      handleTimeIntervalsChange([allDayInterval]);
    } else {
      // Очищаем интервалы
      handleTimeIntervalsChange([]);
    }
  };

  const handleIntervalChangeWithSorting = (intervals: TimeInterval[]) => {
    // Сортируем интервалы по начальному времени (от меньшего к большему)
    const sortedIntervals = [...intervals].sort((a, b) => {
      const timeA = a.startTime || '';
      const timeB = b.startTime || '';
      return timeA.localeCompare(timeB);
    });

    handleTimeIntervalsChange(sortedIntervals);
  };

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 2,
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}>
      {showRemoveButton && (
        <IconButton
          size="small"
          onClick={() => onRemove(eventTypeData.id)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            '& .MuiSvgIcon-root': {
              color: '#000',
              fill: '#000',
            },
          }}>
          <Delete fontSize="small" />
        </IconButton>
      )}

      <Typography variant="subtitle2" gutterBottom>
        {t('form.eventType')} {index + 1}
      </Typography>

      <Autocomplete
        value={eventTypeData.eventType}
        onChange={(_, newValue) => handleEventTypeChange(newValue)}
        options={availableEventTypes}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('form.eventType')}
            placeholder={t('form.searchPlaceholder')}
            fullWidth
            error={!!errors?.eventType}
            helperText={errors?.eventType}
          />
        )}
        fullWidth
        sx={{ mb: 2, width: '100%', maxWidth: '100%', minWidth: 0 }}
        disabled={availableEventTypes.length === 0 && eventTypeData.eventType !== ''}
        freeSolo={false}
        autoSelect
        clearOnBlur
        handleHomeEndKeys
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={isAllDayInterval}
            onChange={handleAllDayChange}
            disabled={eventTypeData.timeIntervals.length > 1}
          />
        }
        label={t('form.intervalAllDay')}
        sx={{ mb: 2 }}
      />

      <TimeIntervalInput
        intervals={eventTypeData.timeIntervals}
        onChange={handleIntervalChangeWithSorting}
        label={t('form.timeIntervalsForEventType')}
        error={errors?.timeIntervals}
        onIntervalChange={() => {
          // При любом изменении интервала вручную снимаем чекбокс "весь день"
          // если текущий интервал не соответствует "00:00 - 23:59"
          if (
            isAllDayInterval &&
            (eventTypeData.timeIntervals.length !== 1 ||
              eventTypeData.timeIntervals[0].startTime !== '00:00' ||
              eventTypeData.timeIntervals[0].endTime !== '23:59')
          ) {
            // Это обрабатывается автоматически через isAllDayInterval
          }
        }}
      />

      {errors?.timeIntervals && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {errors.timeIntervals}
        </Typography>
      )}
    </Box>
  );
};
