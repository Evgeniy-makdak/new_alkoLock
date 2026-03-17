/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

import { AlcolockSelect } from '@entities/alcolock_select';
import { CarsSelect } from '@entities/cars_select';
import { FilterPanel } from '@entities/filter_panel';
import { TypeEventSelect } from '@entities/type_event_select';
import { UsersSelect } from '@entities/users_select';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';

import { HistoryFilters, useHistoryFilterPanel } from '../hooks/useHistoryFilterPanel';
import { historyFilterPanelStore } from '../model/historyFilterPanelStore';

interface HistoryFilterPanelProps {
  open: boolean;
  onFilterChange: () => void;
}

export const HistoryFilterPanel = ({ open, onFilterChange }: HistoryFilterPanelProps) => {
  const { filters: eventFilters, setFilters: setEventFilters } = useHistoryFilterPanel();
  const prevBranchIdRef = useRef<string | number | undefined>(appStore().selectedBranchState?.id);

  useEffect(() => {
    const unsubscribe = appStore.subscribe((state) => {
      const currentId = state.selectedBranchState?.id;
      if (prevBranchIdRef.current !== currentId) {
        historyFilterPanelStore.getState().resetFilters();
        prevBranchIdRef.current = currentId;
      }
      return currentId;
    });

    return () => unsubscribe();
  }, []);

  const handleEventFilterChange = (name: keyof HistoryFilters, value: any) => {
    setEventFilters(name, value);
    onFilterChange();
  };

  return (
    <>
      {open && (
        <FilterPanel>
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
          <TypeEventSelect
            multiple={true}
            name="typeEvent"
            isIn={true}
            useNewEndpoint={true}
            excludedIds={[1, 2, 3, 4, 5]}
            setValueStore={(name, value) =>
              handleEventFilterChange(name as keyof HistoryFilters, value)
            }
            value={eventFilters.typeEvent}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_TYPE_EVENT
            }
            label="Тип события"
          />
          <UsersSelect
            multiple={true}
            excludeUserWithId2={false}
            onlyWithDriverId={false}
            needDriverId={true}
            name="driverId"
            setValueStore={(name: string, value: any) =>
              handleEventFilterChange(name as keyof HistoryFilters, value)
            }
            value={eventFilters.driverId}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER
            }
            label="Поиск по инициатору"
          />
          <UsersSelect
            multiple={true}
            excludeUserWithId2={false}
            onlyWithDriverId={false}
            needDriverId={true}
            name="handlerId"
            setValueStore={(name: string, value: any) =>
              handleEventFilterChange(name as keyof HistoryFilters, value)
            }
            value={eventFilters.handlerId}
            testid={
              testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER
            }
            label="Поиск по исполнителю"
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
        </FilterPanel>
      )}
    </>
  );
};
