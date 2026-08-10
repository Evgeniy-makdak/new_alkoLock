/* eslint-disable react-hooks/exhaustive-deps */
import { type FC, useEffect, useRef, useState } from 'react';

import { RoleAddChangeForm_new } from '@features/role_add_change_form_new';
import { RoleDeleteForm } from '@features/role_delete_form';
import { Table } from '@shared/components/Table/Table';
import { safeScrollToIndexes } from '@shared/lib/safeScrollToIndexes';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useRolesTable } from '../hooks/useRolesTable';
import styles from './RolesTable.module.scss';

interface RoleDesktopTableProps {
  prevBranch?: string | number;
}

export const RoleDesktopTable: FC<RoleDesktopTableProps> = ({ prevBranch }) => {
  const { addModalData, deleteRoleModalData, filtersData, tableData } = useRolesTable();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const isInputFocused = useRef(false);

  // Проверка на открытые модальные окна
  const isAnyModalOpen = addModalData.openAddRoleModal || deleteRoleModalData.isOpen;

  // Сбрасываем пагинацию при изменении prevBranch
  useEffect(() => {
    if (tableData.apiRef.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [prevBranch]);

  useEffect(() => {
    if (tableData.sortModel) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field]);

  // Обработчик клавиатуры
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = event.target as HTMLElement;
      const isInputElement =
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        !!activeElement.closest('.MuiPickersPopper-root'); // Проверяем, находится ли элемент внутри календаря

      // Обновляем состояние фокуса
      isInputFocused.current = isInputElement;

      // Определяем, является ли клавиша навигационной (которую нужно блокировать)
      const isNavigationKey = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Escape',
      ].includes(event.key);

      // Если фокус на input, в календаре или открыто модальное окно - игнорируем навигационные клавиши
      if ((isInputElement || isAnyModalOpen) && isNavigationKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      if (!tableData.rows.length) return;

      setSelectedRowIndex((prev) => {
        let newIndex = prev ?? -1;

        if (event.key === 'ArrowDown') {
          newIndex = Math.min(newIndex + 1, tableData.rows.length - 1);
        } else if (event.key === 'ArrowUp') {
          newIndex = Math.max(newIndex - 1, 0);
        }

        if (newIndex !== prev) {
          const newRow = tableData.rows[newIndex];
          if (newRow) {
            tableData.apiRef.current.selectRow(newRow.id, true);
            tableData.apiRef.current.setRowSelectionModel([newRow.id]);
            safeScrollToIndexes(tableData.apiRef, { rowIndex: newIndex });
          }
        }

        return newIndex;
      });

      if (event.key === 'Enter' && selectedRowIndex !== null) {
        const selectedRow = tableData.rows[selectedRowIndex];
        if (selectedRow) {
          tableData.apiRef.current.setRowSelectionModel([selectedRow.id]);
        }
      }
    };

    // Добавляем обработчик с высоким приоритетом (фаза захвата)
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [tableData.rows, selectedRowIndex, isAnyModalOpen]);

  const handleRowClick = (params: any) => {
    // Обрабатываем клик по любой ячейке строки, включая крайние ячейки
    if (params?.row?.id && !isAnyModalOpen) {
      const rowIndex = tableData.rows.findIndex((row) => row.id === params.row.id);
      setSelectedRowIndex(rowIndex);

      // Принудительно выделяем строку при клике на любую ячейку
      if (tableData.apiRef.current && params.row.id) {
        tableData.apiRef.current.setRowSelectionModel([params.row.id]);
      }
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_roles.roles_widget_header.ROLES_WIDGET_HEADER_SEARCH_INPUT}
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0);
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.apiRef.current.setPage(0);
          }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <TableHeaderEndToolbar />
        </div>
      </TableHeaderWrapper>

      <div className={styles.scrollableTable}>
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
          pointer
          onRowClick={handleRowClick}
          onCellClick={handleRowClick} // Добавляем обработчик клика по ячейке
          getRowClassName={(params) =>
            selectedRowIndex != null &&
            params.id === tableData.rows[selectedRowIndex]?.id
              ? 'selected-row'
              : ''
          }
          sx={{
            '& .MuiDataGrid-root': {
              pointerEvents: isAnyModalOpen ? 'none' : 'auto',
              opacity: isAnyModalOpen ? 0.7 : 1,
              userSelect: isAnyModalOpen ? 'none' : 'auto',
            },
            // Полностью отключаем фокус и выделение для всех ячеек
            '& .MuiDataGrid-cell': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell:focus-within': {
              outline: 'none !important',
            },
            // Отключаем выделение ячеек
            '& .MuiDataGrid-cell--withRenderer': {
              outline: 'none !important',
            },
            // Отключаем box-shadow при фокусе
            '& .MuiDataGrid-cell:focus::after': {
              content: 'none !important',
            },
            // Скрываем тултипы для всех строк кроме hover
            '& .MuiDataGrid-row:not(:hover) .MuiTooltip-tooltip': {
              display: 'none !important',
            },
            '& .MuiDataGrid-row:hover .MuiTooltip-tooltip': {
              display: 'block !important',
            },
            // Скрываем тултипы для кнопок в ячейках действий
            '& .MuiDataGrid-cell:not(:hover) .MuiIconButton-root + .MuiTooltip-tooltip': {
              display: 'none !important',
            },
          }}
          // Дополнительно отключаем фокус через props DataGrid
          disableRowSelectionOnClick={false}
          hideFooterSelectedRowCount={true}
        />
      </div>

      <Popup
        body={
          <RoleAddChangeForm_new
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
    </div>
  );
};
