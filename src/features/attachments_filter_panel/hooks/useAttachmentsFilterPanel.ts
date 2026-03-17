import type { Values } from '@shared/ui/search_multiple_select';

import { attachmentsFilterPanelStore } from '../model/attachmentsFilterPanelStore';

export type AttachmentsFilters = {
  driverId: Values;
  carId: Values;
  alcolocks: Values;
  createLink: Values;
  dateLink: Values;
};

export const useAttachmentsFilterPanel = () => {
  const { filters, setFilters } = attachmentsFilterPanelStore();

  return {
    setFilters,
    filters,
  };
};
