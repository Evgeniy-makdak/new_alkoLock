import type { Dayjs } from 'dayjs';
import { create } from 'zustand';

interface UseAttachmentsStore {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  openFilters: boolean;
  toggleFilters: () => void;
  changeStartDate: (date: Dayjs) => void;
  changeEndDate: (date: Dayjs) => void;
  clearDates: () => void;
}

export const useAttachmentsStore = create<UseAttachmentsStore>()((set) => ({
  startDate: null,
  endDate: null,
  openFilters: false,
  toggleFilters() {
    set((state) => ({ openFilters: !state.openFilters }));
  },
  changeStartDate: (date) => set(() => ({ startDate: date })),
  changeEndDate: (date) => set(() => ({ endDate: date })),
  clearDates: () => set(() => ({ endDate: null, startDate: null })),
}));
