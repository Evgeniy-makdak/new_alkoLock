import { useEffect } from 'react';

import { AttachmentDeleteForm } from '@features/attachment_delete_form';
import { AttachmentAddForm } from '@features/attachments_add_form';
import {
  AttachmentsFilterPanel,
  attachmentsFilterPanelStore,
} from '@features/attachments_filter_panel';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { FilterButton } from '@shared/ui/table_filter_button';

import { useAttachmentsTable } from '../hooks/useAttachmentsTable';

interface AttachmentsTableProps {
  onBranchChange: () => void;
}

export const AttachmentsTable = ({ onBranchChange }: AttachmentsTableProps) => {
  const { addModalData, deleteAttachModalData, filtersData, tableData } = useAttachmentsTable();
  const resetFilters = attachmentsFilterPanelStore((state) => state.resetFilters);
  const hasActiveFilters = attachmentsFilterPanelStore((state) => state.hasActiveFilters);
  // const [isFiltersChanged, setIsFiltersChanged] = useState(false);


  const handleFilterChange = () => {
    if (tableData.apiRef.current) {
      tableData.apiRef.current.setPage(0);
    }
  };

  // Добавляем слушатель для сброса фильтров
  useEffect(() => {
    const resetFiltersListener = () => {
      filtersData.resetFilters();
      handleFilterChange();
    };
    window.addEventListener('resetFilters', resetFiltersListener);

    return () => {
      window.removeEventListener('resetFilters', resetFiltersListener);
    };
  }, [filtersData]);

  useEffect(() => {
    if (tableData.sortModel) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field]);

  useEffect(() => {
    onBranchChange(); // Вызываем очистку фильтров при изменении филиала
  }, [onBranchChange]);

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_SEARCH_INPUT
          }
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0); // Сброс пагинации к первой странице при очистке поиска
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.apiRef.current.setPage(0); // Сброс пагинации к первой странице при изменении поиска
          }}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            tableData.apiRef.current.setPage(0); // Сброс пагинации при очистке дат
          }}
          inputStartTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении даты начала
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении даты окончания
          }}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <FilterButton
          active={hasActiveFilters}
          open={filtersData.openFilters}
          toggle={filtersData.toggleFilters}
          testid={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_FILTER_BUTTON
          }
        />
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            const event = new CustomEvent('resetFilters');
            window.dispatchEvent(event);
            resetFilters();
            filtersData.clearDates();
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0); // Сброс пагинации при сбросе всех фильтров
          }}
        />
      </TableHeaderWrapper>
      <AttachmentsFilterPanel open={filtersData.openFilters} />
      <Table
        sortingMode="server"
        rowCount={tableData.totalCount}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts}
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState} // Пагинация не сбрасывается при изменении страницы
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.headers}
        rows={tableData.rows}
      />
      <Popup
        closeonClickSpace={false}
        toggleModal={addModalData.toggleAddAttachModal}
        headerTitle="Привязка Алкозамка"
        onCloseModal={addModalData.closeAddAttachModal}
        isOpen={addModalData.openAddAttachModal}
        body={<AttachmentAddForm onClose={addModalData.closeAddAttachModal} specified={true} />}
      />
      <Popup
        closeonClickSpace={false}
        onCloseModal={deleteAttachModalData.closeDeleteModal}
        isOpen={deleteAttachModalData.openDeleteModal}
        toggleModal={deleteAttachModalData.closeDeleteModal}
        body={
          <AttachmentDeleteForm
            closeModal={deleteAttachModalData.closeDeleteModal}
            attach={deleteAttachModalData.selectDeleteAttachment}
          />
        }
      />
    </>
  );
};
