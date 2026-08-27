/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import EastIcon from '@mui/icons-material/East';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IconButton, useMediaQuery } from '@mui/material';

import { GroupCarAddForm } from '@features/group_car_add_form';
import { GroupCarMoveForm } from '@features/group_car_move_form';
import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { IBranch } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import { useGroupCarTable } from '../hooks/useGroupCarTable';
import style from './GroupCarTable.module.scss';

type GroupCarTableProps = {
  groupInfo: IBranch;
};

export const GroupCarTable: FC<GroupCarTableProps> = ({ groupInfo }) => {
  const { t } = useTranslation();
  const { addModalData, tableData, filtersData, editModalData, refetch } =
    useGroupCarTable(groupInfo);
  const isMobile = useMediaQuery(breakpoints.mobile);

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
      <>
        <div className={style.mobilePanel}>
          <div className={style.mobileToolbar}>
            <SearchInput
              testId={testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_CARS_TABLE}
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
            {tableData.rows.map((row: any) => (
              <div key={row.id} className={style.mobileCard}>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.mark')}</span>
                  <span className={style.mobileValue}>{row.MARK || '-'}</span>
                </div>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.model')}</span>
                  <span className={style.mobileValue}>{row.MODEL || '-'}</span>
                </div>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>VIN</span>
                  <span className={style.mobileValue}>{row.VIN || '-'}</span>
                </div>
                <div className={style.mobileRow}>
                  <span className={style.mobileLabel}>{t('tables.stateNumber')}</span>
                  <span className={style.mobileValue}>{row.GOS_NUMBER || '-'}</span>
                </div>
                <div className={style.mobileCardActions}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      editModalData.openEditModal({ id: row.id, text: row?.name || '-' });
                    }}>
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
          body={<GroupCarAddForm branchId={groupInfo?.id} close={addModalData.closeAddCarModal} />}
          onCloseModal={addModalData.closeAddCarModal}
          isOpen={addModalData.openAddCarModal}
          toggleModal={addModalData.toggleAddCarModal}
          closeonClickSpace={false}
          closeOnEscapeKey={false}
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
            testId={testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_CARS_TABLE}
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
            onSortModelChange={tableData.changeTableSorts}
            apiRef={tableData.apiRef}
            onPaginationModelChange={tableData.changeTableState} // Навигация по страницам
            pageNumber={tableData.page}
            loading={tableData.isLoading}
            columns={tableData.headers}
            rows={tableData.rows}
            disableColumnSelector
            disableRowSelectionOnClick
            sortingMode="server"
          />
        </div>
      </div>
      <Popup
        body={<GroupCarAddForm branchId={groupInfo?.id} close={addModalData.closeAddCarModal} />}
        onCloseModal={addModalData.closeAddCarModal}
        isOpen={addModalData.openAddCarModal}
        toggleModal={addModalData.toggleAddCarModal}
        closeonClickSpace={false}
        closeOnEscapeKey={false}
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
        closeonClickSpace={false}
        closeOnEscapeKey={false}
      />
    </>
  );
};
