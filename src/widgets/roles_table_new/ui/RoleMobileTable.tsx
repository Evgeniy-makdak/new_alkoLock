/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Add, DeleteForever, Edit } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useRolesTable } from '../hooks/useRolesTable';
import { RoleViewModal } from './RoleViewModal';
import { RolesMobileModals } from './RolesMobileModals';
import styles from './RolesTable.module.scss';

interface RoleMobileTableProps {
  onRoleClick?: (id: ID) => void;
  selectedRoleId?: ID | null;
}

export const RoleMobileTable = ({ onRoleClick }: RoleMobileTableProps) => {
  const { t } = useTranslation();
  const { addModalData, deleteRoleModalData, filtersData, tableData } = useRolesTable();

  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [viewRole, setViewRole] = useState<any>(null);

  const handleFilterChange = () => {
    setIsFiltersChanged(true);
    if (tableData.changeTableState) {
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
    }
  };

  useEffect(() => {
    const resetFiltersListener = () => {
      handleFilterChange();
    };
    window.addEventListener('resetFilters', resetFiltersListener);

    return () => {
      window.removeEventListener('resetFilters', resetFiltersListener);
    };
  }, [filtersData]);

  useEffect(() => {
    if (tableData.changeTableState) {
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
    }
  }, [tableData.sortModel]);

  useEffect(() => {
    if (isFiltersChanged && prevRowCountRef.current !== tableData.totalCount) {
      prevRowCountRef.current = tableData.totalCount;
      setIsFiltersChanged(false);
    }
  }, [tableData.totalCount, isFiltersChanged]);

  useEffect(() => {
    if (pageSize.current !== tableData.pageSize) {
      pageSize.current = tableData.pageSize;
      handleFilterChange();
    }
  }, [tableData.pageSize]);

  const handleRowClick = (row: any) => {
    if (row?.id) {
      setViewRole(row); // Передаем всю строку с данными
      onRoleClick?.(row.id);
      const rowIndex = tableData.rows.findIndex((r) => r.id === row.id);
      setSelectedRowIndex(rowIndex);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (tableData.changeTableState) {
      tableData.changeTableState({ page: newPage, pageSize: tableData.pageSize });
    }
    setSelectedRowIndex(null);
  };

  const handleAddRoleClick = () => {
    addModalData.toggleAddRoleModal();
  };

  const handleEditRoleClick = (id: ID, e: React.MouseEvent) => {
    e.stopPropagation();
    addModalData.toggleAddRoleModal();
    addModalData.handleClickAddRole(id);
  };

  const handleDeleteRoleClick = (id: ID, e: React.MouseEvent) => {
    e.stopPropagation();
    const roleData = tableData.rows.find((row) => row.id === id);
    const roleName = roleData ? getRoleName(roleData) : `Роль с ID: ${id}`;

    deleteRoleModalData.handleClickDeletetRole(id, roleName);
  };

  const handleCloseViewModal = () => {
    setViewRole(null);
  };

  const renderActionButtons = (row: any) => {
    return (
      <>
        <Tooltip title="Редактировать">
          <IconButton
            size="small"
            onClick={(e) => handleEditRoleClick(row.id, e)}
            color="default"
            aria-label="Редактировать">
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Удалить">
          <IconButton
            size="small"
            onClick={(e) => handleDeleteRoleClick(row.id, e)}
            color="default"
            aria-label="Удалить">
            <DeleteForever fontSize="small" />
          </IconButton>
        </Tooltip>
      </>
    );
  };

  const getRoleName = (row: any) => {
    if (row.name && row.name.trim()) {
      return row.name.trim();
    }

    if (row.NAMING && row.NAMING.trim()) {
      return row.NAMING.trim();
    }

    return 'Роль без названия';
  };

  const handleResetAllFilters = () => {
    filtersData.setInput('');
    handleFilterChange();
    const event = new CustomEvent('resetFilters');
    window.dispatchEvent(event);
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.mobileHeader}>
        <h2 className={styles.mobileTitle}>{t('nav.roles')}</h2>
        <IconButton
          className={styles.addButton}
          onClick={handleAddRoleClick}
          color="default"
          aria-label="Добавить роль">
          <Add />
        </IconButton>
      </div>

      <div className={styles.mobileFilters}>
        <SearchInput
          testId={testids.page_roles.roles_widget_header.ROLES_WIDGET_HEADER_SEARCH_INPUT}
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            handleFilterChange();
          }}
          setState={(value) => {
            filtersData.setInput(value);
            handleFilterChange();
          }}
        />

        <div className={styles.resetFiltersContainer}>
          <ResetFilters reset={handleResetAllFilters} />
        </div>
      </div>

      <div className={styles.mobileList}>
        {tableData.rows.length === 0 ? (
          <div className={styles.noData}>Нет данных для отображения</div>
        ) : (
          tableData.rows.map((row, index) => (
            <div
              key={row.id}
              className={`${styles.mobileRow} ${
                index === selectedRowIndex ? styles.selectedRow : ''
              }`}
              onClick={() => handleRowClick(row)}>
              <div className={styles.rowMainInfo}>
                <div className={styles.roleInfo}>
                  <div className={styles.roleName}>{getRoleName(row)}</div>
                </div>

                <div className={styles.rowActions}>{renderActionButtons(row)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.mobilePagination}>
        <MobilePaginationWithJump
          page={tableData.page}
          pageSize={tableData.pageSize}
          totalCount={tableData.totalCount}
          loading={tableData.isLoading}
          onPageChange={handlePageChange}
          buttonClassName={styles.paginationButton}
          infoClassName={styles.paginationInfo}
        />
      </div>

      <RolesMobileModals
        addRoleModalData={{
          changeRoleId: addModalData.changeRoleId,
          closeAddRoleModal: addModalData.closeAddRoleModal,
          openAddRoleModal: addModalData.openAddRoleModal,
        }}
        deleteRoleModalData={{
          closeDeleteModal: deleteRoleModalData.closeDeleteModal,
          deleteRole: deleteRoleModalData.deleteRole,
          isOpen: !!deleteRoleModalData.deleteRole,
        }}
      />

      {viewRole && (
        <RoleViewModal role={viewRole} open={!!viewRole} onClose={handleCloseViewModal} />
      )}
    </div>
  );
};
