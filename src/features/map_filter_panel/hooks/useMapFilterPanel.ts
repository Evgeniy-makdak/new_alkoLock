import type { MapFilters } from '../model/mapFilterPanelStore';
import { mapFilterPanelStore } from '../model/mapFilterPanelStore';

export const useMapFilterPanel = () => {
  const { filters, setFilters, resetFilters, hasActiveFilters } = mapFilterPanelStore();
  const handleFilterChange = (name: keyof MapFilters, value: any) => {
    setFilters(name, value);
  };

  return { filters, setFilters: handleFilterChange, resetFilters, hasActiveFilters };
};
