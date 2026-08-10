/* eslint-disable react-hooks/exhaustive-deps */
import { type FC, useEffect, useRef, useState } from 'react';

import { RoleAddChangeForm } from '@features/role_add_change_form';
import { RoleDeleteForm } from '@features/role_delete_form';
import { Table } from '@shared/components/Table/Table';
import { safeScrollToIndexes } from '@shared/lib/safeScrollToIndexes';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useRolesTable } from '../hooks/useRolesTable';

interface RolesTableProps {
  prevBranch?: string | number;
}

export const RolesTable: FC<RolesTableProps> = ({ prevBranch }) => {
  const { addModalData, deleteRoleModalData, filtersData, tableData } = useRolesTable();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // Проверка на открытые модальные окна
  const isAnyModalOpen = addModalData.openAddRoleModal || deleteRoleModalData.isOpen;

  // Блокировка фокуса и скролла таблицы при открытых модальных окнах
  useEffect(() => {
    if (tableWrapperRef.current) {
      const tableElement = tableWrapperRef.current.querySelector('.MuiDataGrid-root');
      if (tableElement) {
        if (isAnyModalOpen) {
          tableElement.setAttribute('tabindex', '-1');
          (tableElement as HTMLElement).style.pointerEvents = 'none';
          (tableElement as HTMLElement).style.opacity = '0.7';
        } else {
          tableElement.setAttribute('tabindex', '0');
          (tableElement as HTMLElement).style.pointerEvents = 'auto';
          (tableElement as HTMLElement).style.opacity = '1';
        }
      }
    }
  }, [isAnyModalOpen]);

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
      // Определяем, является ли клавиша навигационной (которую нужно блокировать)
      const isNavigationKey = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Escape',
      ].includes(event.key);

      // Если модальное окно открыто и это навигационная клавиша
      if (isAnyModalOpen && isNavigationKey) {
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

  // Дополнительно блокируем фокус на таблице при открытом модальном окне
  useEffect(() => {
    if (tableWrapperRef.current && isAnyModalOpen) {
      const gridElement = tableWrapperRef.current.querySelector('.MuiDataGrid-root');
      if (gridElement) {
        (gridElement as HTMLElement).style.pointerEvents = 'none';
        (gridElement as HTMLElement).style.userSelect = 'none';

        // Снимаем фокус с таблицы
        const activeElement = document.activeElement as HTMLElement;
        if (gridElement.contains(activeElement)) {
          activeElement.blur();
        }
      }
    }
  }, [isAnyModalOpen]);

  return (
    <>
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
        <TableHeaderEndToolbar />
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
        onRowClick={(params) => {
          if (!isAnyModalOpen) {
            setSelectedRowIndex(tableData.rows.findIndex((row) => row.id === params?.id));
          }
        }}
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
          '& .MuiDataGrid-cell:focus': {
            outline: isAnyModalOpen ? 'none' : undefined,
          },
        }}
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
