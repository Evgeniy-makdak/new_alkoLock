import type { Values } from '@shared/ui/search_multiple_select';

import { historyFilterPanelStore } from '../model/historyFilterPanelStore';

export interface HistoryFilters {
  carId: Values;
  alcolocks: Values;
  driverId: Values;
  handlerId: Values;
  typeEvent: Values;
}

export const useHistoryFilterPanel = () => {
  const { filters, setFilters: setFiltersStore } = historyFilterPanelStore();

  const setFilters = (name: keyof HistoryFilters, value: Values) => {
    setFiltersStore(name, value);
  };

  return { filters, setFilters };
};
