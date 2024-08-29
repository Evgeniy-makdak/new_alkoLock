import type { Dayjs } from 'dayjs';
import { create } from 'zustand';

interface UseAutoServiceStore {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  changeStartDate: (date: Dayjs) => void;
  changeEndDate: (date: Dayjs) => void;
  clearDates: () => void;
}

export const useAutoServiceStore = create<UseAutoServiceStore>()((set) => ({
  startDate: null,
  endDate: null,
  changeStartDate: (date) => set(() => ({ startDate: date })),
  changeEndDate: (date) => set(() => ({ endDate: date })),
  clearDates: () => set(() => ({ endDate: null, startDate: null })),
}));
