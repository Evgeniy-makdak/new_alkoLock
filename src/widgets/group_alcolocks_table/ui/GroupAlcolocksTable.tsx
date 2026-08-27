/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import EastIcon from '@mui/icons-material/East';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IconButton, useMediaQuery } from '@mui/material';

import { GroupAlcolockMoveForm } from '@features/group_alcolock_move_form';
import { GroupAlcolocksAddForm } from '@features/group_alcolocks_add_form';
import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { IBranch } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import { useGroupAlcolocksTable } from '../hooks/useGroupAlcolocksTable';
import style from './GroupAlcolocksTable.module.scss';

type GroupAlcolocksTable = {
  groupInfo: IBranch;
};

export const GroupAlcolocksTable: FC<GroupAlcolocksTable> = ({ groupInfo }) => {
  const { t } = useTranslation();
  const { addModalData, tableData, filtersData, editModalData, refetch } =
    useGroupAlcolocksTable(groupInfo);
  const isMobile = useMediaQuery(breakpoints.mobile);

  const handlePageChange = (newPage: number) => {
    tableData.changeTableState({ page: newPage, pageSize: tableData.pageSize });
  };

  if (isMobile) {
    return (
      <>
        <div className={style.mobilePanel}>
          <div className={style.mobileToolbar}>
            <SearchInput
              testId={
                testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_INPUT_SEARCH
              }
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
              <IconButton size="small" onClick={addModalData.toggleAddAlcolockModal}>
                <AddIcon />
              </IconButton>
            </div>
          </div>

          <div className={style.mobileList}>
            {tableData.rows.map((row: any) => (
              <div key={row.id} className={style.mobileCard}>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.naming')}</span>
                  <span className={style.mobileValue}>{row.NAMING || '-'}</span>
                </div>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.serialNumber')}</span>
                  <span className={style.mobileValue}>{row.SERIAL_NUMBER || '-'}</span>
                </div>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.installedOnVehicle')}</span>
                  <span className={style.mobileValue}>{row.TC || '-'}</span>
                </div>
                <div className={style.mobileCardActions}>
                  <IconButton
                    size="small"
                    onClick={() =>
                      editModalData.openEditModal({ id: row.id, text: row?.name || '-' })
                    }>
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
          body={
            <GroupAlcolocksAddForm
              branchId={groupInfo?.id}
              close={addModalData.closeAddAlcolockModal}
            />
          }
          onCloseModal={addModalData.closeAddAlcolockModal}
          isOpen={addModalData.openAddAlcolockModal}
          toggleModal={addModalData.toggleAddAlcolockModal}
          closeonClickSpace={false}
          closeOnEscapeKey={false}
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
          closeonClickSpace={false}
          closeOnEscapeKey={false}
        />
      </>
    );
  }

  return (
    <>
      <div className={`asideTablePanel ${style.asideTablePanel}`}>
        <TableHeaderWrapper>
          <SearchInput
            testId={testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_INPUT_SEARCH}
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
        <div className={style.asideTableBody}>
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
        </div>
      </div>
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
        closeonClickSpace={false}
        closeOnEscapeKey={false}
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
        closeonClickSpace={false}
        closeOnEscapeKey={false}
      />
    </>
  );
};
