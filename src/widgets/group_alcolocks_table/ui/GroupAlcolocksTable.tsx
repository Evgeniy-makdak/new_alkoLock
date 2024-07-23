/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FC } from 'react';

import { GroupAlcolockMoveForm } from '@features/group_alcolock_move_form';
import { GroupAlcolocksAddForm } from '@features/group_alcolocks_add_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { IBranch } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useGroupAlcolocksTable } from '../hooks/useGroupAlcolocksTable';

type GroupAlcolocksTable = {
  groupInfo: IBranch;
};

export const GroupAlcolocksTable: FC<GroupAlcolocksTable> = ({ groupInfo }) => {
  const { addModalData, tableData, filtersData, editModalData } = useGroupAlcolocksTable(groupInfo);
  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_INPUT_SEARCH}
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
        body={
          <GroupAlcolocksAddForm
            branchId={groupInfo?.id}
            close={addModalData.closeAddAlcolockModal}
          />
        }
        onCloseModal={addModalData.closeAddAlcolockModal}
        isOpen={addModalData.openAddAlcolockModal}
        toggleModal={addModalData.toggleAddAlcolockModal}
      />
      <Popup
        isOpen={editModalData.open}
        toggleModal={editModalData.closeEditModal}
        body={
          <GroupAlcolockMoveForm
            targetBranch={groupInfo?.id}
            close={editModalData.closeEditModal}
            alcolock={editModalData.changeAlcolock}
          />
        }
      />
    </>
  );
};
