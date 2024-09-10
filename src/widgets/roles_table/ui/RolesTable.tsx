import type { FC } from 'react';

import { RoleAddChangeForm } from '@features/role_add_change_form';
import { RoleDeleteForm } from '@features/role_delete_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useRolesTable } from '../hooks/useRolesTable';

export const RolesTable: FC = () => {
  const { addModalData, deleteRoleModalData, filtersData, tableData } = useRolesTable();

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_roles.roles_widget_header.ROLES_WIDGET_HEADER_SEARCH_INPUT}
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
        sortingMode="server"
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts}
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState}
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.headers}
        rows={tableData.rows}
      />
      <Popup
        body={
          <RoleAddChangeForm
            id={addModalData.changeRoleId}
            closeModal={addModalData.closeAddRoleModal}
          />
        }
        onCloseModal={addModalData.closeAddRoleModal}
        isOpen={addModalData.openAddRoleModal}
        toggleModal={addModalData.toggleAddRoleModal}
      />

      <Popup
        body={
          <RoleDeleteForm
            role={deleteRoleModalData.deleteRole}
            closeModal={deleteRoleModalData.closeDeleteModal}
          />
        }
        onCloseModal={deleteRoleModalData.closeDeleteModal}
        isOpen={deleteRoleModalData.isOpen}
        toggleModal={deleteRoleModalData.closeDeleteModal}
      />
    </>
  );
};
