import { AlcolockSelect } from '@entities/alcolock_select';
import { CarsSelect } from '@entities/cars_select';
import { DateOfLinkSelect } from '@entities/date_of_link_select';
import { FilterPanel } from '@entities/filter_panel';
import { UsersCreateAttachSelect } from '@entities/users_create_attach_select';
import { UsersSelect } from '@entities/users_select';
import { testids } from '@shared/const/testid';

import { useAttachmentsFilterPanel } from '../hooks/useAttachmentsFilterPanel';

export const AttachmentsFilterPanel = ({ open }: { open: boolean }) => {
  const { filters, setFilters } = useAttachmentsFilterPanel();

  return (
    <>
      {open ? (
        <FilterPanel>
          <UsersSelect
            multiple={true}
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
            name="carId"
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_CAR
            }
            setValueStore={setFilters}
            value={filters.carId}
            label="Поиск по ТС"
          />
          <UsersCreateAttachSelect
            multiple={true}
            name="createLink"
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_CREATE_LINK
            }
            label="Поиск по создавшему привязку"
            setValueStore={setFilters}
            value={filters.createLink}
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
          <DateOfLinkSelect
            multiple={true}
            name="dateLink"
            setValueStore={setFilters}
            value={filters.dateLink}
            label="Поиск по дате привязки"
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_DATE_LINK
            }
          />
        </FilterPanel>
      ) : null}
    </>
  );
};
