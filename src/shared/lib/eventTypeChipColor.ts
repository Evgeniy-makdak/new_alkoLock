import type { ChipProps } from '@mui/material';

/** Как в таблице событий (`getColumns` / `EventsMobileTable`): цвет чипа по тексту типа события */
export function getEventTypeChipColor(typeOfEvent: string): ChipProps['color'] {
  if (!typeOfEvent) {
    return 'default';
  }
  if (
    typeOfEvent.includes('Ошибка E-') ||
    typeOfEvent.includes('Неразрешенное движение') ||
    typeOfEvent.includes('Тестирование не пройдено') ||
    typeOfEvent.includes('Невозможно заблокировать двигатель, ТС в движении') ||
    typeOfEvent.includes('Фальсификация выдоха')
  ) {
    return 'error';
  }
  if (typeOfEvent.includes('Тестирование пройдено')) {
    return 'success';
  }
  if (typeOfEvent.includes('Тестирование прервано')) {
    return 'warning';
  }
  return 'default';
}
