/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AttachmentDeleteForm } from '@features/attachment_delete_form';
import { AttachmentAddForm } from '@features/attachments_add_form';
import {
  AttachmentsFilterPanel,
  attachmentsFilterPanelStore,
} from '@features/attachments_filter_panel';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { FilterButton } from '@shared/ui/table_filter_button';

import { useAttachmentsTable } from '../hooks/useAttachmentsTable';

interface AttachmentsDesktopTableProps {
  onBranchChange: () => void;
  prevBranch?: ID;
}

export const AttachmentsDesktopTable = ({
  onBranchChange,
  prevBranch,
}: AttachmentsDesktopTableProps) => {
  const { t } = useTranslation();
  const { addModalData, deleteAttachModalData, filtersData, tableData } = useAttachmentsTable();
  const resetFilters = attachmentsFilterPanelStore((state) => state.resetFilters);
  const hasActiveFilters = attachmentsFilterPanelStore((state) => state.hasActiveFilters);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);
  const isInputFocused = useRef(false);

  const isAnyModalOpen = addModalData.openAddAttachModal || deleteAttachModalData.openDeleteModal;

  const handleFilterChange = () => {
    if (tableData.apiRef.current) {
      tableData.apiRef.current.setPage(0);
    }
  };

  useEffect(() => {
    tableData.apiRef.current.setPage(0);
  }, [prevBranch]);

  useEffect(() => {
    const resetFiltersListener = () => {
      filtersData.resetFilters();
      handleFilterChange();
    };
    window.addEventListener('resetFilters', resetFiltersListener);

    return () => {
      window.removeEventListener('resetFilters', resetFiltersListener);
    };
  }, [filtersData]);

  useEffect(() => {
    if (tableData.sortModel) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field]);

  useEffect(() => {
    onBranchChange();
  }, [onBranchChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = event.target as HTMLElement;
      const isInputElement =
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        Boolean(activeElement.closest('.MuiPickersPopper-root'));

      isInputFocused.current = isInputElement;

      if (isInputElement || isAnyModalOpen) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
          return;
        }
      }
      const isNavigationKey = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Escape',
      ].includes(event.key);

      if (isAnyModalOpen && isNavigationKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      if (!tableData.rows.length) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();

        const currentId = selectedRowId;
        const currentIndex = currentId
          ? tableData.rows.findIndex((row) => row.id === currentId)
          : -1;

        let newIndex = 0;
        if (currentIndex >= 0) {
          newIndex =
            event.key === 'ArrowDown'
              ? Math.min(currentIndex + 1, tableData.rows.length - 1)
              : Math.max(currentIndex - 1, 0);
        }

        const newRow = tableData.rows[newIndex];
        if (newRow) {
          setSelectedRowId(newRow.id);
          tableData.apiRef.current.setRowSelectionModel([newRow.id]);
          tableData.apiRef.current.scrollToIndexes({ rowIndex: newIndex });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [tableData.rows, selectedRowId, isAnyModalOpen]);

  const handleRowClick = (params: any) => {
    if (params?.row?.id && !isAnyModalOpen) {
      setSelectedRowId(params.row.id);
      tableData.apiRef.current.setRowSelectionModel([params.row.id]);
    }
  };

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_SEARCH_INPUT
          }
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
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            tableData.apiRef.current.setPage(0);
          }}
          inputStartTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            tableData.apiRef.current.setPage(0);
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            tableData.apiRef.current.setPage(0);
          }}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <FilterButton
          active={hasActiveFilters}
          open={filtersData.openFilters}
          toggle={filtersData.toggleFilters}
          testid={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_FILTER_BUTTON
          }
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <TableHeaderEndToolbar>
            <ResetFilters
              reset={() => {
                const event = new CustomEvent('resetFilters');
                window.dispatchEvent(event);
                resetFilters();
                filtersData.clearDates();
                filtersData.setInput('');
                tableData.apiRef.current.setPage(0);
              }}
            />
          </TableHeaderEndToolbar>
        </div>
      </TableHeaderWrapper>
      <AttachmentsFilterPanel open={filtersData.openFilters} />
      <Table
        sortingMode="server"
        rowCount={tableData.totalCount}
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
        onCellClick={handleRowClick}
        getRowClassName={(params) => (params.id === selectedRowId ? 'selected-row' : '')}
        rowSelectionModel={selectedRowId ? [selectedRowId] : []}
        sx={{
          '& .MuiDataGrid-root': {
            pointerEvents: isAnyModalOpen ? 'none' : 'auto',
            opacity: isAnyModalOpen ? 0.7 : 1,
            userSelect: isAnyModalOpen ? 'none' : 'auto',
          },
          '& .MuiDataGrid-cell': {
            outline: 'none !important',
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none !important',
          },
          '& .MuiDataGrid-cell:focus-within': {
            outline: 'none !important',
          },
          '& .MuiDataGrid-cell--withRenderer': {
            outline: 'none !important',
          },
          '& .MuiDataGrid-cell:focus::after': {
            content: 'none !important',
          },
        }}
        disableRowSelectionOnClick={false}
        hideFooterSelectedRowCount={true}
      />
      <Popup
        closeonClickSpace={false}
        toggleModal={addModalData.toggleAddAttachModal}
        headerTitle={t('modals.bindAlcolock')}
        onCloseModal={addModalData.closeAddAttachModal}
        isOpen={addModalData.openAddAttachModal}
        body={<AttachmentAddForm onClose={addModalData.closeAddAttachModal} specified={true} />}
      />
      <Popup
        closeonClickSpace={false}
        onCloseModal={deleteAttachModalData.closeDeleteModal}
        isOpen={deleteAttachModalData.openDeleteModal}
        toggleModal={deleteAttachModalData.closeDeleteModal}
        body={
          <AttachmentDeleteForm
            closeModal={deleteAttachModalData.closeDeleteModal}
            attach={deleteAttachModalData.selectDeleteAttachment}
          />
        }
      />
    </>
  );
};
