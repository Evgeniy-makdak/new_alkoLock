/* eslint-disable react-hooks/exhaustive-deps */
import { type FC, useEffect, useRef, useState } from 'react';

import { DeleteMailingsForm } from '@features/delete_mailings_form';
import { MailingsAddChangeForm } from '@features/mailings_add_change_form';
import { RecoverMailingsForm } from '@features/recover_mailings_form/ui';
import { TrueDeleteMailingsForm } from '@features/true_delete_mailings_form';
import { Table } from '@shared/components/Table/Table';
import { safeScrollToIndexes as scrollGridToIndexes } from '@shared/lib/safeScrollToIndexes';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { useMailingsTable } from '../hooks/useMailingsTable';

type MailingsDesktopTableProps = {
  onBranchChange: () => void;
};

export const MailingsDesktopTable: FC<MailingsDesktopTableProps> = ({
  onBranchChange, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const {
    filtersData,
    tableData,
    addModalData,
    deleteMailingModalData,
    recoverMailingModalData,
    trueDeleteMailingModalData,
  } = useMailingsTable();
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const { statusFilter, resetStatusFilter } = useStatusFilter();
  const [selectedGroupEmail, setSelectedGroupEmail] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const isInputFocused = useRef(false);
  const [isTableReady, setIsTableReady] = useState(false);

  const emailGroups = Array.from(new Set(tableData.rows.map((row) => row._email)))
    .filter((email) => email)
    .map((email, index) => ({
      email,
      index,
      firstRowIndex: tableData.rows.findIndex((row) => row._email === email && row._isFirstRow),
    }));

  const isAnyModalOpen =
    addModalData.openAddMailingModal ||
    deleteMailingModalData.isOpen ||
    recoverMailingModalData.isOpen ||
    trueDeleteMailingModalData.isOpen;

  const safeScrollToIndexes = (rowIndex: number) => {
    scrollGridToIndexes(tableData.apiRef, { rowIndex });
  };

  const selectGroup = (rowId: string) => {
    const row = tableData.rows.find((row) => row.id === rowId);
    if (row) {
      const groupIndex = emailGroups.findIndex((group) => group.email === row._email);
      setSelectedGroupEmail(row._email);
      setSelectedGroupIndex(groupIndex);

      const firstRowIndex = tableData.rows.findIndex(
        (r) => r._email === row._email && r._isFirstRow,
      );
      if (firstRowIndex !== -1) {
        safeScrollToIndexes(firstRowIndex);
      }
    }
  };

  const selectGroupByIndex = (groupIndex: number) => {
    if (groupIndex >= 0 && groupIndex < emailGroups.length) {
      const group = emailGroups[groupIndex];
      setSelectedGroupEmail(group.email);
      setSelectedGroupIndex(groupIndex);

      if (group.firstRowIndex !== -1) {
        safeScrollToIndexes(group.firstRowIndex);
      }
    }
  };

  const clearSelection = () => {
    setSelectedGroupEmail(null);
    setSelectedGroupIndex(null);
  };

  const handleFilterChange = () => {
    if (tableData.apiRef?.current) {
      setIsFiltersChanged(true);
      tableData.apiRef.current.setPage(0);
    }
  };

  useEffect(() => {
    if (statusFilter && tableData.apiRef?.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [statusFilter]);

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
    if (tableData.sortModel && tableData.apiRef?.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field]);

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

  useEffect(() => {
    if (tableData.apiRef?.current && tableData.rows.length > 0) {
      setIsTableReady(true);
    }
  }, [tableData.apiRef?.current, tableData.rows.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = event.target as HTMLElement;
      const isInputElement =
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        Boolean(activeElement.closest('.MuiPickersPopper-root'));

      isInputFocused.current = isInputElement;

      if (isInputElement || isAnyModalOpen) {
        if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(event.key)
        ) {
          return;
        }
      }

      if (event.key === 'Escape') {
        clearSelection();
        return;
      }

      if (!tableData.rows.length || isInputElement || emailGroups.length === 0 || !isTableReady)
        return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const currentIndex = selectedGroupIndex !== null ? selectedGroupIndex : -1;
        const newIndex = Math.min(currentIndex + 1, emailGroups.length - 1);
        if (newIndex !== currentIndex) {
          selectGroupByIndex(newIndex);
        } else if (currentIndex === -1 && emailGroups.length > 0) {
          selectGroupByIndex(0);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const currentIndex = selectedGroupIndex !== null ? selectedGroupIndex : emailGroups.length;
        const newIndex = Math.max(currentIndex - 1, 0);
        if (newIndex !== currentIndex) {
          selectGroupByIndex(newIndex);
        } else if (currentIndex === emailGroups.length && emailGroups.length > 0) {
          selectGroupByIndex(emailGroups.length - 1);
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        selectGroupByIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        selectGroupByIndex(emailGroups.length - 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tableData.rows, selectedGroupIndex, isAnyModalOpen, emailGroups, isTableReady]);

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            handleFilterChange();
          }}
          setState={(value) => {
            filtersData.setInput(value);
            handleFilterChange();
          }}
          showStatusFilter={true}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            handleFilterChange();
          }}
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            handleFilterChange();
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            handleFilterChange();
          }}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <TableHeaderEndToolbar>
          <ResetFilters
            reset={() => {
              filtersData.clearDates();
              filtersData.setInput('');
              resetStatusFilter();
              handleFilterChange();
              const event = new CustomEvent('resetFilters');
              window.dispatchEvent(event);
            }}
          />
        </TableHeaderEndToolbar>
      </TableHeaderWrapper>
      <Table
        rowCount={tableData.totalCount}
        getRowHeight={() => 'auto'}
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
          if (!isAnyModalOpen && params) {
            selectGroup(params.id as string);
          }
        }}
        getRowClassName={(params) => {
          if (selectedGroupEmail && params.row._email === selectedGroupEmail) {
            return 'selected-group';
          }
          return '';
        }}
        disableRowSelectionOnClick={true}
        hideFooterSelectedRowCount={true}
        pointer
      />
      <Popup
        body={
          <MailingsAddChangeForm
            id={addModalData.changeMailingId}
            closeModal={addModalData.closeAddMailingModal}
          />
        }
        closeonClickSpace={false}
        onCloseModal={addModalData.closeAddMailingModal}
        isOpen={addModalData.openAddMailingModal}
        toggleModal={addModalData.toggleAddMailingModal}
      />
      <Popup
        body={
          <DeleteMailingsForm
            mailing={deleteMailingModalData.deleteMailing}
            closeModal={deleteMailingModalData.closeDeleteModal}
            closeAside={() => {}}
          />
        }
        onCloseModal={deleteMailingModalData.closeDeleteModal}
        isOpen={deleteMailingModalData.isOpen}
        toggleModal={deleteMailingModalData.closeDeleteModal}
      />
      <Popup
        body={
          <RecoverMailingsForm
            mailing={recoverMailingModalData.recoverMailing}
            closeModal={recoverMailingModalData.closeRecoverModal}
            closeAside={() => {}}
          />
        }
        onCloseModal={recoverMailingModalData.closeRecoverModal}
        isOpen={recoverMailingModalData.isOpen}
        toggleModal={recoverMailingModalData.closeRecoverModal}
      />
      <Popup
        body={
          <TrueDeleteMailingsForm
            mailing={trueDeleteMailingModalData.trueDeleteMailing}
            closeModal={trueDeleteMailingModalData.closeTrueDeleteModal}
            closeAside={() => {}}
          />
        }
        onCloseModal={trueDeleteMailingModalData.closeTrueDeleteModal}
        isOpen={trueDeleteMailingModalData.isOpen}
        toggleModal={trueDeleteMailingModalData.closeTrueDeleteModal}
      />
    </>
  );
};
