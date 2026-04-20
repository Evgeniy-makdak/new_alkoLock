import { useTranslation } from 'react-i18next';

import { useMediaQuery } from '@mui/material';

import { AlcolockSelect } from '@entities/alcolock_select';
import { CarsSelect } from '@entities/cars_select';
import { FilterPanel } from '@entities/filter_panel';
import { TypeEventSelect } from '@entities/type_event_select';
import { LevelSelect } from '@entities/type_event_select/ui/LevelSelect';
import { UsersSelect } from '@entities/users_select';
import styles from '@features/events_filter_panel/ui/EventsFilterPanel.module.scss';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';

import type { ReportsFilters } from '../model/reportsFiltersStore';
import { reportsFiltersStore } from '../model/reportsFiltersStore';

type ReportsFilterPanelProps = {
  /** Вертикальная раскладка (модалка на планшете и т.п.) */
  layout?: 'default' | 'stacked';
};

export function ReportsFilterPanel({ layout = 'default' }: ReportsFilterPanelProps) {
  const { t } = useTranslation();
  const filters = reportsFiltersStore((s) => s.filters);
  const setFilters = reportsFiltersStore((s) => s.setFilters);

  const handleFilterChange = (name: keyof ReportsFilters, value: unknown) => {
    setFilters(name, value as Parameters<typeof setFilters>[1]);
  };

  const { permissions: storePermissionsFromUsers } = appStore();
  const hasServiceOrDriverAccess =
    storePermissionsFromUsers.includes('SYSTEM_SERVICE_ACCOUNT') ||
    storePermissionsFromUsers.includes('SYSTEM_DRIVER_ACCOUNT');
  const hasReadPermission = storePermissionsFromUsers.includes('PERMISSION_EVENTS_READ');
  const isUsersSelectDisabled = hasServiceOrDriverAccess && !hasReadPermission;

  const isMobile = useMediaQuery('(max-width:768px)');
  const useStackedLayout = layout === 'stacked' || isMobile;

  return (
    <div className={useStackedLayout ? styles.mobileFilterPanelForced : undefined}>
      <FilterPanel>
        <UsersSelect
          multiple={true}
          excludeDisabledUsers={false}
          excludeUserWithId2={false}
          onlyWithDriverId={false}
          needDriverId={true}
          name="driverId"
          setValueStore={(name: string, value: unknown) =>
            handleFilterChange(name as keyof ReportsFilters, value)
          }
          value={filters.driverId}
          testid={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER}
          label={t('filters.searchByUser')}
          disabled={isUsersSelectDisabled}
        />
        <CarsSelect
          multiple={true}
          name="carId"
          testid={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_CAR
          }
          setValueStore={(name, value) => handleFilterChange(name, value)}
          value={filters.carId}
          label={t('filters.searchByVehicle')}
        />
        <AlcolockSelect
          multiple={true}
          label={t('filters.searchByAlcolock')}
          setValueStore={(name, value) => handleFilterChange(name, value)}
          value={filters.alcolocks}
          testid={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_ALCOLOKS
          }
          name="alcolocks"
        />
        <LevelSelect
          multiple={true}
          name="level"
          setValueStore={(name, value) => handleFilterChange(name as keyof ReportsFilters, value)}
          value={filters.level}
          label={t('filters.level')}
        />
        <TypeEventSelect
          multiple={true}
          name="typeEvent"
          setValueStore={(name, value) => handleFilterChange(name as keyof ReportsFilters, value)}
          value={filters.typeEvent}
          levelEvent={filters.level}
          testid={
            testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_TYPE_EVENT
          }
          label={t('filters.eventType')}
        />
      </FilterPanel>
    </div>
  );
}
