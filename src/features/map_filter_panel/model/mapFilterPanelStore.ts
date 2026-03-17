import { create } from 'zustand';

import { arraysHasLength } from '@shared/lib/arraysHasLength';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

export interface MapFilters {
  driverId: Values;
  carId: Values;
  alcolocks: Values;
}

interface MapFilterPanelStore {
  filters: MapFilters;
  setFilters: (type: keyof MapFilters, value: Values | Value) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

export const mapFilterPanelStore = create<MapFilterPanelStore>()((set, get) => ({
  filters: {
    driverId: [],
    carId: [],
    alcolocks: [],
  },
  hasActiveFilters: false,
  setFilters(type, value) {
    const filters = get().filters;
    const readyValue = ArrayUtils.getArrayValues(value);
    const newState = { ...filters, [type]: readyValue };
    const hasActiveFilters = arraysHasLength([
      newState.driverId,
      newState.carId,
      newState.alcolocks,
    ]);

    set(() => ({
      hasActiveFilters,
      filters: newState,
    }));
  },
  resetFilters() {
    set(() => ({
      hasActiveFilters: false,
      filters: {
        driverId: [],
        carId: [],
        alcolocks: [],
      },
    }));
  },
}));
