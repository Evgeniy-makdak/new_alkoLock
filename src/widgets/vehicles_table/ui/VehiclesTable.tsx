/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FC } from 'react';

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

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_SEARCH_INPUT
          }
          value={filtersData.input}
          onClear={() => filtersData.setInput('')}
          setState={filtersData.setInput}
        />
        <InputsDates
          onClear={filtersData.clearDates}
          inputStartTestId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={filtersData.changeStartDate}
          onChangeEndDate={filtersData.changeEndDate}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <ResetFilters title="Сбросить фильтры" reset={() => filtersData.clearDates()} />
      </TableHeaderWrapper>
      <Table
        // TODO => кол-во элементов должно приходить с бэка
        sortingMode="server"
        rowCount={100}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts}
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState}
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
