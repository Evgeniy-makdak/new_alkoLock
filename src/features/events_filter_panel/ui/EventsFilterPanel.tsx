import { CarsGosNumberSelect } from '@entities/cars_gos_number_select';
import { FilterPanel } from '@entities/filter_panel';
import { TypeEventSelect } from '@entities/type_event_select';
import { UsersSelect } from '@entities/users_select';
import { AlcolockSelect } from '@entities/alcolock_select';
import { testids } from '@shared/const/testid';

import { EventsFilters, useEventsFilterPanel } from '../hooks/useEventsFilterPanel';

interface EventsFilterPanelProps {
  open: boolean;
  onFilterChange: () => void;
}

export const EventsFilterPanel = ({ open, onFilterChange }: EventsFilterPanelProps) => {
  const { filters, setFilters } = useEventsFilterPanel();

  const handleChange = (name: keyof EventsFilters, value: any) => {
    setFilters(name, value);
    onFilterChange();
  };

  return (
    <>
      {open && (
        <FilterPanel>
          <UsersSelect
            multiple={true}
            excludeUserWithId2={false} // Отображение пользователей в выпадающем списке во
            onlyWithDriverId={false} // вкладке События.
            needDriverId={true}
            name="driverId"
            setValueStore={(name: string, value: any) => handleChange(name as keyof EventsFilters, value)}
            value={filters.driverId}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER
            }
            label="Поиск по пользователю"
          />
          <CarsGosNumberSelect
            multiple={true}
            name="vehicle"
            setValueStore={(name, value) => handleChange(name as keyof EventsFilters, value)}
            value={filters.gosNumber}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_GOS_NUMBER
            }
            label="Поиск по ТС"
          />
          <AlcolockSelect
            multiple={true}
            label="Поиск по алкозамку"
            setValueStore={setFilters}
            value={filters.alcolocks}
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_ALCOLOKS
            }
            name="alcolocks"
          />
          <TypeEventSelect
            multiple={true}
            name="typeEvent"
            setValueStore={(name, value) => handleChange(name as keyof EventsFilters, value)}
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
