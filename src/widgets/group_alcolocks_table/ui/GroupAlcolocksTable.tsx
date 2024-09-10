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
          onClear={() => {
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0); // Сброс пагинации при очистке поиска
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении поиска
          }}
        />
      </TableHeaderWrapper>
      <Table
        rowCount={tableData.totalCount}
        paginationMode="server"
        sortingMode="server"
        onSortModelChange={tableData.changeTableSorts} // Сортировка без сброса пагинации
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState} // Пагинация сохраняется при навигации
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.headers}
        rows={tableData.rows}
        disableColumnSelector
        disableRowSelectionOnClick
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
