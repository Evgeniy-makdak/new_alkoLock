import { create } from 'zustand';

import { arraysHasLength } from '@shared/lib/arraysHasLength';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import type { EventsFilters } from '../hooks/useEventsFilterPanel';

interface EventsFilterPanelStore {
  filters: EventsFilters;
  setFilters: (type: keyof EventsFilters, value: (string | Value)[] | Value) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  selectedLabel: string | null; // Добавлено новое состояние
}

export const eventsFilterPanelStore = create<EventsFilterPanelStore>()((set, get) => ({
  filters: {
    driverId: [],
    carId: [],
    alcolocks: [],
    typeEvent: [],
    level: [],
  },
  hasActiveFilters: false,
  selectedLabel: null, // Инициализация нового состояния
  setFilters(type, value) {
    const filters = get().filters;
    const readyValue = ArrayUtils.getArrayValues(value);
    const newState = { ...filters, [type]: readyValue };
    const hasActiveFilters = arraysHasLength([
      newState.driverId,
      newState.carId,
      newState.alcolocks,
      newState.typeEvent,
    ]);

    set(() => ({
      hasActiveFilters,
      filters: newState,
      selectedLabel: readyValue.length > 0 ? readyValue[0].label : null, // Установка нового состояния
    }));
  },
  resetFilters() {
    set(() => ({
      hasActiveFilters: false,
      filters: {
        driverId: [],
        carId: [],
        alcolocks: [],
        typeEvent: [],
        level: [],
      },
      selectedLabel: null, // Сброс нового состояния
    }));
  },
}));
