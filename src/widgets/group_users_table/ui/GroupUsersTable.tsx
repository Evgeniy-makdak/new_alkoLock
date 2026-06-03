/* eslint-disable react-hooks/exhaustive-deps */
import { type FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import EastIcon from '@mui/icons-material/East';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IconButton, useMediaQuery } from '@mui/material';

import { GroupUserAddForm } from '@features/group_user_add_form';
import { GroupUserMoveForm } from '@features/group_user_move_form';
import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderMobileTrailingProvider } from '@shared/components/table_header_wrapper/model/TableHeaderMobileTrailingContext';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { IBranch } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import { useGroupUsersTable } from '../hooks/useGroupUsersTable';
import style from './GroupUsersTable.module.scss';

type GroupUsersTableProps = {
  groupInfo: IBranch;
};

export const GroupUsersTable: FC<GroupUsersTableProps> = ({ groupInfo }) => {
  const { t } = useTranslation();
  const { filtersData, tableData, addModalData, editModalData, refetch } =
    useGroupUsersTable(groupInfo);
  const isMobile = useMediaQuery(breakpoints.mobile);
  // В этой вкладке нужно скрыть конкретного пользователя id=1 ("Администратор").
  // Фильтр применяется ТОЛЬКО здесь (виджет группы/вкладка "Пользователи").
  const filteredRows = tableData.rows.filter(
    (row) => String(row.id) !== '2' && String(row.id) !== '1',
  );

  useEffect(() => {
    if (tableData.sortModel) {
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field]);

  const handlePageChange = (newPage: number) => {
    tableData.changeTableState({ page: newPage, pageSize: tableData.pageSize });
  };

  if (isMobile) {
    return (
      <TableHeaderMobileTrailingProvider>
        <div className={style.mobilePanel}>
          <div className={style.mobileToolbar}>
            <SearchInput
              testId={testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_TABLE}
              value={filtersData.input}
              onClear={() => {
                filtersData.setInput('');
                tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
              }}
              setState={(value) => {
                filtersData.setInput(value);
                tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
              }}
            />
            <div className={style.mobileToolbarActions}>
              <IconButton size="small" onClick={() => refetch?.()}>
                <RefreshIcon />
              </IconButton>
              <IconButton size="small" onClick={addModalData.toggleAddCarModal}>
                <AddIcon />
              </IconButton>
            </div>
          </div>

          <div className={style.mobileList}>
            {filteredRows.map((row: any) => (
              <div key={row.id} className={style.mobileCard}>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.user')}</span>
                  <span className={style.mobileValue}>{row.USER || '-'}</span>
                </div>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.email')}</span>
                  <span className={style.mobileValue}>{row.EMAIL || '-'}</span>
                </div>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.linkedVehicles')}</span>
                  <span className={style.mobileValue}>
                    {Array.isArray(row.CAR_LINK) && row.CAR_LINK.length
                      ? row.CAR_LINK.join(', ')
                      : '-'}
                  </span>
                </div>
                <div className={style.mobileCardActions}>
                  <IconButton
                    size="small"
                    onClick={() => editModalData.openEditModal({ id: row.id, text: row.USER || '-' })}>
                    <EastIcon />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>

          <div className={style.mobilePagination}>
            <MobilePaginationWithJump
              page={tableData.page}
              pageSize={tableData.pageSize}
              totalCount={tableData.totalCount}
              loading={tableData.isLoading}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
        <Popup
          isOpen={addModalData.openAddCarModal}
          toggleModal={addModalData.closeAddCarModal}
          closeonClickSpace={false}
          closeOnEscapeKey={false}
          body={<GroupUserAddForm close={addModalData.closeAddCarModal} branchId={groupInfo?.id} />}
        />
        <Popup
          isOpen={editModalData.open}
          toggleModal={editModalData.closeEditModal}
          closeonClickSpace={false}
          closeOnEscapeKey={false}
          body={
            <GroupUserMoveForm
              targetBranch={groupInfo?.id}
              close={editModalData.closeEditModal}
              user={editModalData.changeUser}
            />
          }
        />
      </TableHeaderMobileTrailingProvider>
    );
  }

  return (
    <TableHeaderMobileTrailingProvider>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_TABLE}
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
          }}
        />
        <TableHeaderEndToolbar showThemeToggle={false} />
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
        rows={filteredRows}
        disableColumnSelector
        disableRowSelectionOnClick
      />
      <Popup
        isOpen={addModalData.openAddCarModal}
        toggleModal={addModalData.closeAddCarModal}
        closeonClickSpace={false}
        closeOnEscapeKey={false}
        body={<GroupUserAddForm close={addModalData.closeAddCarModal} branchId={groupInfo?.id} />}
      />
      <Popup
        isOpen={editModalData.open}
        toggleModal={editModalData.closeEditModal}
        closeonClickSpace={false}
        closeOnEscapeKey={false}
        body={
          <GroupUserMoveForm
            targetBranch={groupInfo?.id}
            close={editModalData.closeEditModal}
            user={editModalData.changeUser}
          />
        }
      />
    </TableHeaderMobileTrailingProvider>
  );
};
