/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslation } from 'react-i18next';

import { useMediaQuery } from '@mui/material';

import { AlcolockSelect } from '@entities/alcolock_select';
import { CarsSelect } from '@entities/cars_select';
import { FilterPanel } from '@entities/filter_panel';
import { TypeEventSelect } from '@entities/type_event_select';
import { LevelSelect } from '@entities/type_event_select/ui/LevelSelect';
import { UsersSelect } from '@entities/users_select';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';

import { EventsFilters, useEventsFilterPanel } from '../hooks/useEventsFilterPanel';
import styles from './EventsFilterPanel.module.scss';

interface EventsFilterPanelProps {
  open: boolean;
  onFilterChange: () => void;
  /** Вертикальная раскладка (модалка на планшете и т.п.) */
  layout?: 'default' | 'stacked';
}

export const EventsFilterPanel = ({
  open,
  onFilterChange,
  layout = 'default',
}: EventsFilterPanelProps) => {
  const { t } = useTranslation();
  const { filters: eventFilters, setFilters: setEventFilters } = useEventsFilterPanel();
  const handleEventFilterChange = (name: keyof EventsFilters, value: any) => {
    setEventFilters(name, value);
    onFilterChange();
  };
  const { permissions: storePermissionsFromUsers, fullName: userFullNameFromStore } = appStore();

  const hasServiceOrDriverAccess =
    storePermissionsFromUsers.includes('SYSTEM_SERVICE_ACCOUNT') ||
    storePermissionsFromUsers.includes('SYSTEM_DRIVER_ACCOUNT');
  const hasReadPermission = storePermissionsFromUsers.includes('PERMISSION_EVENTS_READ');
  const isUsersSelectDisabled = hasServiceOrDriverAccess && !hasReadPermission;

  const isMobile = useMediaQuery('(max-width:768px)');
  const useStackedLayout = layout === 'stacked' || isMobile;

  return (
    <>
      {open && (
        <div className={useStackedLayout ? styles.mobileFilterPanelForced : undefined}>
          <FilterPanel>
            <UsersSelect
              multiple={true}
              excludeDisabledUsers={false}
              excludeUserWithId2={false}
              onlyWithDriverId={false}
              needDriverId={true}
              name="driverId"
              setValueStore={(name: string, value: any) =>
                handleEventFilterChange(name as keyof EventsFilters, value)
              }
              value={eventFilters.driverId}
              testid={
                testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER
              }
              label={t('filters.searchByUser')}
              disabled={isUsersSelectDisabled}
              placeholder={
                isUsersSelectDisabled && userFullNameFromStore ? userFullNameFromStore : undefined
              }
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
              label={t('filters.searchByVehicle')}
            />
            <AlcolockSelect
              multiple={true}
              label={t('filters.searchByAlcolock')}
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
              label={t('filters.level')}
            />
            <TypeEventSelect
              multiple={true}
              name="typeEvent"
              setValueStore={(name, value) =>
                handleEventFilterChange(name as keyof EventsFilters, value)
              }
              value={eventFilters.typeEvent}
              levelEvent={eventFilters.level}
              testid={
                testids.page_events.events_widget_header
                  .EVENTS_WIDGET_HEADER_FILTER_INPUT_TYPE_EVENT
              }
              label={t('filters.eventType')}
            />
          </FilterPanel>
        </div>
      )}
    </>
  );
};
