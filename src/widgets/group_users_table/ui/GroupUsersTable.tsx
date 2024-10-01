import { useEffect, type FC } from 'react';

import { GroupUserAddForm } from '@features/group_user_add_form';
import { GroupUserMoveForm } from '@features/group_user_move_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { IBranch } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useGroupUsersTable } from '../hooks/useGroupUsersTable';

type GroupUsersTableProps = {
  groupInfo: IBranch;
};

export const GroupUsersTable: FC<GroupUsersTableProps> = ({ groupInfo }) => {
  const { filtersData, tableData, addModalData, editModalData } = useGroupUsersTable(groupInfo);

  useEffect(() => {
    if(tableData.sortModel) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field])

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_TABLE}
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
        getRowHeight={() => 'auto'}
        paginationMode="server"
        sortingMode="server"
        onSortModelChange={tableData.changeTableSorts} 
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
        isOpen={addModalData.openAddCarModal}
        toggleModal={addModalData.closeAddCarModal}
        body={<GroupUserAddForm close={addModalData.closeAddCarModal} branchId={groupInfo?.id} />}
      />
      <Popup
        isOpen={editModalData.open}
        toggleModal={editModalData.closeEditModal}
        body={
          <GroupUserMoveForm
            targetBranch={groupInfo.id}
            close={editModalData.closeEditModal}
            user={editModalData.changeUser}
          />
        }
      />
    </>
  );
};
