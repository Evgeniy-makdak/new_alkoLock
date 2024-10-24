import type { Values } from '@shared/ui/search_multiple_select';
import { historyFilterPanelStore } from '../model/historyFilterPanelStore';

export interface HistoryFilters {
  driverId: Values;
  markCar: Values;
  gosNumber: Values;
  typeEvent: Values;
}

export const useHistoryFilterPanel = () => {
  const { filters, setFilters: setFiltersStore } = historyFilterPanelStore();

  const setFilters = (name: keyof HistoryFilters, value: Values) => {
    setFiltersStore(name, value); 
  };

  return { filters, setFilters };
};
