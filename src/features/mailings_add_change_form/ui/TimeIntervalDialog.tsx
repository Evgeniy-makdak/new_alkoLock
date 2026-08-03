import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

interface TimeIntervalDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (startTime: string, endTime: string) => void;
  interval?: { startTime: string; endTime: string; id?: string } | null;
  existingIntervals?: Array<{ startTime: string; endTime: string; id?: string }>;
}

export const TimeIntervalDialog: React.FC<TimeIntervalDialogProps> = ({
  open,
  onClose,
  onSave,
  interval,
  existingIntervals = [],
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- t is used in JSX
  const { t } = useTranslation();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errors, setErrors] = useState({ startTime: '', endTime: '', overlap: '' });

  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  /** Значения на момент открытия — кнопка неактивна, пока не изменили хотя бы одно поле. */
  const baselineRef = useRef({ start: '', end: '' });

  useEffect(() => {
    if (interval) {
      setStartTime(interval.startTime);
      setEndTime(interval.endTime);
      baselineRef.current = { start: interval.startTime, end: interval.endTime };
    } else {
      setStartTime('');
      setEndTime('');
      baselineRef.current = { start: '', end: '' };
    }
    setErrors({ startTime: '', endTime: '', overlap: '' });
  }, [interval, open]);

  const isIntervalDirty =
    startTime !== baselineRef.current.start || endTime !== baselineRef.current.end;

  const timeToMinutes = (time: string): number => {
    if (!time || time.length !== 5) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const checkIntervalOverlap = (
    newStart: string,
    newEnd: string,
  ): { hasOverlap: boolean; overlappingField: 'start' | 'end' | 'both' } => {
    const newStartMinutes = timeToMinutes(newStart);
    const newEndMinutes = timeToMinutes(newEnd);

    // Исключаем текущий редактируемый интервал из проверки
    const intervalsToCheck = existingIntervals.filter((existingInterval) => {
      if (interval && existingInterval.id === interval.id) {
        return false;
      }
      return true;
    });

    for (const existingInterval of intervalsToCheck) {
      const existingStart = timeToMinutes(existingInterval.startTime);
      const existingEnd = timeToMinutes(existingInterval.endTime);

      // Проверяем, какое именно поле вызывает пересечение
      const startOverlaps = newStartMinutes >= existingStart && newStartMinutes < existingEnd;
      const endOverlaps = newEndMinutes > existingStart && newEndMinutes <= existingEnd;
      const containsExisting = newStartMinutes <= existingStart && newEndMinutes >= existingEnd;
      const isContained = newStartMinutes >= existingStart && newEndMinutes <= existingEnd;

      if (startOverlaps && endOverlaps) {
        return { hasOverlap: true, overlappingField: 'both' };
      } else if (startOverlaps) {
        return { hasOverlap: true, overlappingField: 'start' };
      } else if (endOverlaps) {
        return { hasOverlap: true, overlappingField: 'end' };
      } else if (containsExisting) {
        return { hasOverlap: true, overlappingField: 'both' };
      } else if (isContained) {
        return { hasOverlap: true, overlappingField: 'both' };
      }
    }

    return { hasOverlap: false, overlappingField: 'both' };
  };

  const formatTimeInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length === 0) return '';

    if (numbers.length === 1) {
      const firstDigit = parseInt(numbers[0]);
      if (firstDigit > 2) {
        return `0${numbers[0]}:`;
      }
      return numbers;
    }

    if (numbers.length === 2) {
      const hours = parseInt(numbers);
      if (hours > 23) {
        return `23:`;
      }
      return `${numbers}:`;
    }

    if (numbers.length === 3) {
      const hours = numbers.substring(0, 2);
      const minute = numbers[2];
      return `${hours}:${minute}`;
    }

    if (numbers.length === 4) {
      const hours = numbers.substring(0, 2);
      const minutes = numbers.substring(2, 4);
      const minutesNum = parseInt(minutes);
      if (minutesNum > 59) {
        return `${hours}:59`;
      }
      return `${hours}:${minutes}`;
    }

    return `${numbers.substring(0, 2)}:${numbers.substring(2, 4)}`;
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatTimeInput(e.target.value);
    setStartTime(formattedValue);

    // Очищаем ошибки при изменении
    if (errors.overlap) {
      setErrors({ ...errors, overlap: '' });
    }

    if (formattedValue.length === 5 && endTimeRef.current) {
      endTimeRef.current.focus();
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatTimeInput(e.target.value);
    setEndTime(formattedValue);

    // Очищаем ошибки при изменении
    if (errors.overlap) {
      setErrors({ ...errors, overlap: '' });
    }
  };

  const handleStartTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9' && startTime.length === 1) {
      const newValue = startTime + e.key;
      const formattedValue = formatTimeInput(newValue);
      setStartTime(formattedValue);
      e.preventDefault();
    }
  };

  const handleEndTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9' && endTime.length === 1) {
      const newValue = endTime + e.key;
      const formattedValue = formatTimeInput(newValue);
      setEndTime(formattedValue);
      e.preventDefault();
    }
  };

  const validateTime = (time: string): boolean => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  const validateIntervals = (start: string, end: string): boolean => {
    if (!start || !end) return false;

    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);

    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;

    return endTotal > startTotal;
  };

  const handleSave = () => {
    const newErrors = { startTime: '', endTime: '', overlap: '' };
    let isValid = true;

    // Валидация формата времени
    if (!validateTime(startTime)) {
      newErrors.startTime = 'Введите время в формате ЧЧ:ММ (00:00 - 23:59)';
      isValid = false;
    }

    if (!validateTime(endTime)) {
      newErrors.endTime = 'Введите время в формате ЧЧ:ММ (00:00 - 23:59)';
      isValid = false;
    }

    // Валидация порядка времени
    if (isValid && !validateIntervals(startTime, endTime)) {
      newErrors.endTime = 'Конечное время должно быть позже начального';
      isValid = false;
    }

    // Проверка на пересечение с существующими интервалами
    if (isValid) {
      const overlapResult = checkIntervalOverlap(startTime, endTime);
      if (overlapResult.hasOverlap) {
        newErrors.overlap = 'Интервал пересекается с существующими интервалами';
        isValid = false;

        // Устанавливаем ошибку только в проблемное поле
        if (overlapResult.overlappingField === 'start') {
          newErrors.startTime = 'Начальное время пересекается с существующим интервалом';
        } else if (overlapResult.overlappingField === 'end') {
          newErrors.endTime = 'Конечное время пересекается с существующим интервалом';
        } else {
          newErrors.startTime = 'Интервал пересекается с существующим';
          newErrors.endTime = 'Интервал пересекается с существующим';
        }
      }
    }

    setErrors(newErrors);

    if (isValid) {
      onSave(startTime, endTime);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        onClose();
      }}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth>
      <DialogTitle>{interval ? 'Редактировать интервал' : 'Добавить интервал'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            label="Начальное время"
            value={startTime}
            onChange={handleStartTimeChange}
            onKeyDown={handleStartTimeKeyDown}
            onKeyPress={handleKeyPress}
            placeholder="ЧЧ:ММ"
            error={Boolean(errors.startTime)}
            helperText={errors.startTime}
            fullWidth
            margin="normal"
            inputRef={startTimeRef}
            inputProps={{
              maxLength: 5,
            }}
          />
          <TextField
            label="Конечное время"
            value={endTime}
            onChange={handleEndTimeChange}
            onKeyDown={handleEndTimeKeyDown}
            onKeyPress={handleKeyPress}
            placeholder="ЧЧ:ММ"
            error={Boolean(errors.endTime)}
            helperText={errors.endTime}
            fullWidth
            margin="normal"
            inputRef={endTimeRef}
            inputProps={{
              maxLength: 5,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleSave}
          disabled={!isIntervalDirty}
          variant="outlined"
          sx={{
            color: '#000',
            borderColor: '#000',
            '&:hover': {
              borderColor: '#000',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}>
          {interval ? t('common.save') : t('common.add')}
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: '#000',
            borderColor: '#000',
            '&:hover': {
              borderColor: '#000',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}>
          {t('common.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
