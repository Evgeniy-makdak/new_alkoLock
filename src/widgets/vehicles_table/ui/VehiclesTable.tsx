/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, type FC } from 'react';

import { CarAddChangeForm } from '@features/car_add_change_form';
import { DeleteCarForm } from '@features/delete_car_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useVehiclesTable } from '../hooks/useVehiclesTable';

type VehiclesTableProps = {
  onClickRow: (id: ID) => void;
};

export const VehiclesTable: FC<VehiclesTableProps> = ({ onClickRow }) => {
  const { filtersData, tableData, addModalData, deleteCarModalData } = useVehiclesTable();

  useEffect(() => {
    if(tableData.sortModel) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field])

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_SEARCH_INPUT
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
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_TO_DATE
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
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            filtersData.clearDates();
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0); // Сброс пагинации при сбросе всех фильтров
          }}
        />
      </TableHeaderWrapper>
      <Table
        sortingMode="server"
        rowCount={tableData.totalCount}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts} // Изменение сортировки пагиннация сбрасывается
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState} // Пагинация не сбрасывается при изменении страницы
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.headers}
        rows={tableData.rows}
        onRowClick={(params) => onClickRow(params?.id)}
      />
      <Popup
        body={
          <CarAddChangeForm
            id={addModalData.changeCarId}
            closeModal={addModalData.closeAddCarModal}
          />
        }
        onCloseModal={addModalData.closeAddCarModal}
        isOpen={addModalData.openAddCarModal}
        toggleModal={addModalData.toggleAddCarModal}
      />
      <Popup
        isOpen={!!deleteCarModalData.deleteCar}
        toggleModal={deleteCarModalData.closeDeleteModal}
        body={
          <DeleteCarForm
            closeModal={deleteCarModalData.closeDeleteModal}
            car={deleteCarModalData.deleteCar}
          />
        }
      />
    </>
  );
};
