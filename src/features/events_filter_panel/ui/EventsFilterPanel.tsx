import { CarsGosNumberSelect } from '@entities/cars_gos_number_select';
import { FilterPanel } from '@entities/filter_panel';
import { MarksCarSelect } from '@entities/marks_car_select';
import { TypeEventSelect } from '@entities/type_event_select';
import { UsersSelect } from '@entities/users_select';
import { testids } from '@shared/const/testid';

import { useEventsFilterPanel } from '../hooks/useEventsFilterPanel';

export const EventsFilterPanel = ({ open }: { open: boolean }) => {
  const { filters, setFilters } = useEventsFilterPanel();
  return (
    <>
      {open && (
        <FilterPanel>
          <UsersSelect
            multiple={true}
            name="driverId"
            setValueStore={setFilters}
            value={filters.driverId}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER
            }
            label="Поиск по водителю"
          />
          <MarksCarSelect
            multiple={true}
            name="markCar"
            setValueStore={setFilters}
            value={filters.markCar}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_BRAND_CAR
            }
            label="Поиск по марке"
          />
          <CarsGosNumberSelect
            multiple={true}
            name="gosNumber"
            setValueStore={setFilters}
            value={filters.gosNumber}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_GOS_NUMBER
            }
            label="Поиск по гос.номеру"
          />
          <TypeEventSelect
            multiple={true}
            name="typeEvent"
            setValueStore={setFilters}
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
