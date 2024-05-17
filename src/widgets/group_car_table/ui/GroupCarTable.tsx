/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC } from 'react';

import { GroupCarAddForm } from '@features/group_car_add_form';
import { GroupCarMoveForm } from '@features/group_car_move_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { IBranch } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useGroupCarTable } from '../hooks/useGroupCarTable';

type GroupCarTable = {
  groupInfo: IBranch;
};

export const GroupCarTable: FC<GroupCarTable> = ({ groupInfo }) => {
  const { addModalData, tableData, filtersData, editModalData } = useGroupCarTable(groupInfo);
  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_CARS_TABLE}
          value={filtersData.input}
          onClear={() => filtersData.setInput('')}
          setState={filtersData.setInput}
        />
      </TableHeaderWrapper>
      <Table
        // TODO => кол-во элементов должно приходить с бэка
        rowCount={100}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts}
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState}
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.headers}
        rows={tableData.rows}
        disableColumnSelector
        disableRowSelectionOnClick
        sortingMode="server"
      />
      <Popup
        body={<GroupCarAddForm branchId={groupInfo?.id} close={addModalData.closeAddCarModal} />}
        onCloseModal={addModalData.closeAddCarModal}
        isOpen={addModalData.openAddCarModal}
        toggleModal={addModalData.toggleAddCarModal}
      />
      <Popup
        isOpen={editModalData.open}
        toggleModal={editModalData.closeEditModal}
        body={
          <GroupCarMoveForm
            targetBranch={groupInfo?.id}
            close={editModalData.closeEditModal}
            car={editModalData.changeCar}
          />
        }
      />
    </>
  );
};
