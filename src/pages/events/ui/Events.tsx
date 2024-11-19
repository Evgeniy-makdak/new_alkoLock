/* eslint-disable @typescript-eslint/no-unused-vars */
import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
// import { EventInfo } from '@widgets/events_info';
import { EventsTable } from '@widgets/events_table';

import { useEventsPage } from '../hooks/useEventsPage';
import { useRef } from 'react';
import { appStore } from '@shared/model/app_store/AppStore';

const Events = () => {
  const { handleClickRow, handleCloseAside, selectedEventId, tabs } = useEventsPage();
  const prevBranch = useRef(null);
  const { selectedBranchState } = appStore(
    (state) => state,
  );

  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
    handleCloseAside();
  }



  return (
    <>
      <PageWrapper>
        <EventsTable handleClickRow={handleClickRow} />
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
