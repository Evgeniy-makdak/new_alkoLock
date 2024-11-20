/* eslint-disable @typescript-eslint/no-unused-vars */
import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { EventsTable } from '@widgets/events_table';

import { useEventsPage } from '../hooks/useEventsPage';
import { useRef } from 'react';
import { appStore } from '@shared/model/app_store/AppStore';

const Events = () => {
  const { handleClickRow, handleCloseAside, selectedEventId, tabs } = useEventsPage();
  const prevBranch = useRef(null);
  const { selectedBranchState } = appStore((state) => state);

  const handleBranchChange = () => {
    const event = new CustomEvent('resetFilters'); // Генерируем событие сброса фильтров
    window.dispatchEvent(event);
  };

  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
    handleCloseAside();
    handleBranchChange();
  }

  return (
    <>
      <PageWrapper>
        <EventsTable handleClickRow={handleClickRow} onBranchChange={handleBranchChange} />
      </PageWrapper>

      {selectedEventId && (
        <Aside onClose={handleCloseAside}>
          <RowTableInfo tabs={tabs} />
        </Aside>
      )}
    </>
  );
};

export default Events;
