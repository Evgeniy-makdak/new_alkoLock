import { useTranslation } from 'react-i18next';

import { AlcolockSelect } from '@entities/alcolock_select';
import { CarsSelect } from '@entities/cars_select';
import { FilterPanel } from '@entities/filter_panel';
import { UsersCreateAttachSelect } from '@entities/users_create_attach_select';
import { UsersSelect } from '@entities/users_select';
import { testids } from '@shared/const/testid';

import { useAttachmentsFilterPanel } from '../hooks/useAttachmentsFilterPanel';

export const AttachmentsFilterPanel = ({ open }: { open: boolean }) => {
  const { t } = useTranslation();
  const { filters, setFilters } = useAttachmentsFilterPanel();

  return (
    <>
      {open ? (
        <FilterPanel>
          <UsersSelect
            multiple={true}
            isAttachment={true}
            excludeUserWithId2={false} // Отображение во вкладке Привязки
            onlyWithDriverId={true} // в выпадающем фильтре
            name="driverId"
            setValueStore={setFilters}
            value={filters.driverId}
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER
            }
            label="Поиск по водителю"
          />
          <CarsSelect
            multiple={true}
            isAttachment={true}
            name="carId"
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_CAR
            }
            setValueStore={setFilters}
            value={filters.carId}
            label={t('filters.searchByVehicle')}
          />
          <UsersCreateAttachSelect
            multiple={true}
            name="createLink"
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_CREATE_LINK
            }
            label={t('filters.searchByCreator')}
            setValueStore={setFilters}
            value={filters.createLink}
          />
          <AlcolockSelect
            multiple={true}
            label={t('filters.searchByAlcolock')}
            setValueStore={setFilters}
            value={filters.alcolocks}
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_ALCOLOKS
            }
            name="alcolocks"
          />
        </FilterPanel>
      ) : null}
    </>
  );
};
