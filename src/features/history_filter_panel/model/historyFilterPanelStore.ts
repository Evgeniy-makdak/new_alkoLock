import { create } from 'zustand';

import { arraysHasLength } from '@shared/lib/arraysHasLength';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import type { HistoryFilters } from '../hooks/useHistoryFilterPanel';

interface HistoryFilterPanelStore {
  filters: HistoryFilters;
  setFilters: (type: keyof HistoryFilters, value: (string | Value)[] | Value) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  selectedLabel: string | null; // Добавлено новое состояние
}

export const historyFilterPanelStore = create<HistoryFilterPanelStore>()((set, get) => ({
  filters: {
    driverId: [],
    gosNumber: [],
    markCar: [],
    typeEvent: [],
  },
  hasActiveFilters: false,
  selectedLabel: null, // Инициализация нового состояния
  setFilters(type, value) {
    const filters = get().filters;
    const readyValue = ArrayUtils.getArrayValues(value);
    const newState = { ...filters, [type]: readyValue };
    const hasActiveFilters = arraysHasLength([
      newState.gosNumber,
      newState.markCar,
      newState.typeEvent,
      newState.driverId,
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
        gosNumber: [],
        markCar: [],
        typeEvent: [],
        driverId: [],
      },
      selectedLabel: null, // Сброс нового состояния
    }));
  },
}));
