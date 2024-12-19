import type { Values } from '@shared/ui/search_multiple_select';
import { eventsFilterPanelStore } from '../model/eventsFilterPanelStore';

export interface EventsFilters {
  driverId: Values;
  carId: Values;
  alcolocks: Values;
  typeEvent: Values;
  level: Values;
}

export const useEventsFilterPanel = () => {
  const { filters, setFilters: setFiltersStore } = eventsFilterPanelStore();
  const setFilters = (name: keyof EventsFilters, value: Values) => {
    setFiltersStore(name, value); 
  };

  return { filters, setFilters };
};
