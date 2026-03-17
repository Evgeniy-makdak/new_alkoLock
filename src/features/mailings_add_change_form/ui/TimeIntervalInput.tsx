import React, { useState } from 'react';

// Убираем неиспользуемый TextField
import { Add, Delete, Edit } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';

import { TimeIntervalDialog } from './TimeIntervalDialog';

export interface TimeInterval {
  id: string;
  startTime: string;
  endTime: string;
}

interface TimeIntervalInputProps {
  intervals: TimeInterval[];
  onChange: (intervals: TimeInterval[]) => void;
  label?: string;
  error?: any;
  onIntervalChange?: () => void; // Новый пропс для уведомления об изменении интервала
}

export const TimeIntervalInput: React.FC<TimeIntervalInputProps> = ({
  intervals,
  onChange,
  label = 'Интервалы времени',
  error = false,
  onIntervalChange,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInterval, setEditingInterval] = useState<TimeInterval | null>(null);

  const handleAddInterval = () => {
    setEditingInterval(null);
    setIsDialogOpen(true);
  };

  const handleEditInterval = (interval: TimeInterval) => {
    setEditingInterval(interval);
    setIsDialogOpen(true);
  };

  const handleDeleteInterval = (id: string) => {
    onChange(intervals.filter((interval) => interval.id !== id));
    onIntervalChange?.();
  };

  const handleSaveInterval = (startTime: string, endTime: string) => {
    if (editingInterval) {
      // Редактирование существующего интервала
      const updatedIntervals = intervals.map((interval) =>
        interval.id === editingInterval.id ? { ...interval, startTime, endTime } : interval,
      );
      onChange(updatedIntervals);
    } else {
      // Добавление нового интервала
      const newInterval: TimeInterval = {
        id: Date.now().toString(),
        startTime,
        endTime,
      };

      // Сортируем интервалы по начальному времени при добавлении нового
      const sortedIntervals = [...intervals, newInterval].sort((a, b) => {
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
      });

      onChange(sortedIntervals);
    }
    onIntervalChange?.();
    setIsDialogOpen(false);
    setEditingInterval(null);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingInterval(null);
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {label}
      </Typography>

      {/* Кнопка добавления */}
      <IconButton
        onClick={handleAddInterval}
        color="primary"
        sx={{
          mb: 2,
          '& .MuiSvgIcon-root': {
            color: '#000',
            fill: '#000',
          },
        }}>
        <Add />
      </IconButton>

      {/* Список интервалов */}
      {intervals.map((interval) => (
        <Box
          key={interval.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            p: 1,
            border: '1px solid',
            borderColor: error ? 'error.main' : 'divider',
            borderRadius: 1,
          }}>
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            {interval.startTime} - {interval.endTime}
          </Typography>
          <IconButton
            size="small"
            onClick={() => handleEditInterval(interval)}
            sx={{
              '& .MuiSvgIcon-root': {
                color: '#000',
                fill: '#000',
              },
            }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteInterval(interval.id)}
            sx={{
              '& .MuiSvgIcon-root': {
                color: '#000',
                fill: '#000',
              },
            }}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}

      {/* Модальное окно */}
      <TimeIntervalDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveInterval}
        interval={editingInterval}
        existingIntervals={intervals}
      />
    </Box>
  );
};
