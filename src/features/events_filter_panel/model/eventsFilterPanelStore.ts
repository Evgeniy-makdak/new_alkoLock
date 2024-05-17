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
}

export const eventsFilterPanelStore = create<EventsFilterPanelStore>()((set, get) => ({
  filters: {
    driverId: [],
    gosNumber: [],
    markCar: [],
    typeEvent: [],
  },
  hasActiveFilters: false,
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
    }));
  },
}));
