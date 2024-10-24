import { CarsGosNumberSelect } from '@entities/cars_gos_number_select';
import { FilterPanel } from '@entities/filter_panel';
import { MarksCarSelect } from '@entities/marks_car_select';
import { TypeEventSelect } from '@entities/type_event_select';
import { UsersSelect } from '@entities/users_select';
import { testids } from '@shared/const/testid';

import { HistoryFilters, useHistoryFilterPanel } from '../hooks/useHistoryFilterPanel';

interface HistoryFilterPanelProps {
  open: boolean;
  onFilterChange: () => void;
}

export const HistoryFilterPanel = ({ open, onFilterChange }: HistoryFilterPanelProps) => {
  const { filters, setFilters } = useHistoryFilterPanel();

  const handleChange = (name: keyof HistoryFilters, value: any) => {
    setFilters(name, value);
    onFilterChange();
  };

  return (
    <>
      {open && (
        <FilterPanel>
          <UsersSelect
            multiple={true}
            name="driverId"
            setValueStore={(name, value) => handleChange(name as keyof HistoryFilters, value)}
            value={filters.driverId}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER
            }
            label="Поиск по водителю"
          />
          <MarksCarSelect
            multiple={true}
            name="markCar"
            setValueStore={(name, value) => handleChange(name as keyof HistoryFilters, value)}
            value={filters.markCar}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_BRAND_CAR
            }
            label="Поиск по марке"
          />
          <CarsGosNumberSelect
            multiple={true}
            name="gosNumber"
            setValueStore={(name, value) => handleChange(name as keyof HistoryFilters, value)}
            value={filters.gosNumber}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_GOS_NUMBER
            }
            label="Поиск по гос.номеру"
          />
          <TypeEventSelect
            multiple={true}
            name="typeEvent"
            setValueStore={(name, value) => handleChange(name as keyof HistoryFilters, value)}
            value={filters.typeEvent}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_TYPE_EVENT
            }
            label="Тип события"
          />
        </FilterPanel>
      )}
    </>
  );
};
