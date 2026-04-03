import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { create } from 'zustand';

import { arraysHasLength } from '@shared/lib/arraysHasLength';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

export interface ReportsFilters {
  driverId: Value[];
  carId: Value[];
  alcolocks: Value[];
  typeEvent: Value[];
  level: Value[];
}

interface ReportsFiltersStore {
  filters: ReportsFilters;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  hasActiveFilters: boolean;
  setFilters: (type: keyof ReportsFilters, value: Value | Value[]) => void;
  setStartDate: (d: Dayjs | null) => void;
  setEndDate: (d: Dayjs | null) => void;
  clearDates: () => void;
  resetAll: () => void;
}

const emptyFilters = (): ReportsFilters => ({
  driverId: [],
  carId: [],
  alcolocks: [],
  typeEvent: [],
  level: [],
});

const computeHasActive = (filters: ReportsFilters) =>
  arraysHasLength([
    filters.driverId,
    filters.carId,
    filters.alcolocks,
    filters.level,
    filters.typeEvent,
  ]);

export const defaultReportsStartDate = (): Dayjs => dayjs().subtract(7, 'day').startOf('day');

export const defaultReportsEndDate = (): Dayjs => dayjs().endOf('day');

export const reportsFiltersStore = create<ReportsFiltersStore>()((set, get) => ({
  filters: emptyFilters(),
  startDate: defaultReportsStartDate(),
  endDate: defaultReportsEndDate(),
  hasActiveFilters: false,
  setFilters(type, value) {
    const readyValue = ArrayUtils.getArrayValues(value);
    const filters = { ...get().filters, [type]: readyValue };
    set({
      filters,
      hasActiveFilters: computeHasActive(filters),
    });
  },
  setStartDate: (d) => set({ startDate: d }),
  setEndDate: (d) => set({ endDate: d }),
  clearDates: () => set({ startDate: null, endDate: null }),
  resetAll() {
    set({
      filters: emptyFilters(),
      startDate: defaultReportsStartDate(),
      endDate: defaultReportsEndDate(),
      hasActiveFilters: false,
    });
  },
}));
