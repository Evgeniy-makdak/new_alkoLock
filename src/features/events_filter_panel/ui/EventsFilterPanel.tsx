import { AlcolockSelect } from '@entities/alcolock_select';
import { CarsSelect } from '@entities/cars_select';
import { FilterPanel } from '@entities/filter_panel';
import { TypeEventSelect } from '@entities/type_event_select';
import { LevelSelect } from '@entities/type_event_select/ui/LevelSelect';
import { UsersSelect } from '@entities/users_select';
import { testids } from '@shared/const/testid';

import { EventsFilters, useEventsFilterPanel } from '../hooks/useEventsFilterPanel';

interface EventsFilterPanelProps {
  open: boolean;
  onFilterChange: () => void;
}

export const EventsFilterPanel = ({ open, onFilterChange }: EventsFilterPanelProps) => {
  const { filters: eventFilters, setFilters: setEventFilters } = useEventsFilterPanel();
  const handleEventFilterChange = (name: keyof EventsFilters, value: any) => {
    setEventFilters(name, value);
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
            setValueStore={(name: string, value: any) =>
              handleEventFilterChange(name as keyof EventsFilters, value)
            }
            value={eventFilters.driverId}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER
            }
            label="Поиск по пользователю"
          />
          <CarsSelect
            multiple={true}
            name="carId"
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_CAR
            }
            setValueStore={handleEventFilterChange}
            value={eventFilters.carId}
            label="Поиск по ТС"
          />
          <AlcolockSelect
            multiple={true}
            label="Поиск по алкозамку"
            setValueStore={handleEventFilterChange}
            value={eventFilters.alcolocks}
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_ALCOLOKS
            }
            name="alcolocks"
          />
          <LevelSelect
            multiple={true}
            name="level"
            setValueStore={(name, value) =>
              handleEventFilterChange(name as keyof EventsFilters, value)
            }
            value={eventFilters.level} 
            label="Уровень"
          />
          <TypeEventSelect
            multiple={true}
            name="typeEvent"
            setValueStore={(name, value) =>
              handleEventFilterChange(name as keyof EventsFilters, value)
            }
            value={eventFilters.typeEvent}
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
