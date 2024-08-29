import type { Values } from '@shared/ui/search_multiple_select';

import { eventsFilterPanelStore } from '../model/eventsFilterPanelStore';

export interface EventsFilters {
  driverId: Values;
  markCar: Values;
  gosNumber: Values;
  typeEvent: Values;
}

export const useEventsFilterPanel = () => {
  const { filters, setFilters } = eventsFilterPanelStore();

  return { filters, setFilters };
};
