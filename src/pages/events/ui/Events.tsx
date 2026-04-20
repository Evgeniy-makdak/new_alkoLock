import React, { useEffect, useRef } from 'react';

import { useMediaQuery } from '@mui/material';

import { RowTableInfo } from '@entities/row_table_info';
import { eventsFilterPanelStore } from '@features/events_filter_panel';
import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { Aside } from '@shared/ui/aside';
import { EventsTable } from '@widgets/events_table';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import { useEventsPage } from '../hooks/useEventsPage';

const Events: React.FC = () => {
  const { handleClickRow, handleCloseAside, selectedEventId, tabs, activeTab, setActiveTab, isAsideOpen } =
    useEventsPage();
  const prevBranch = useRef(null);
  const { selectedBranchState } = appStore((state) => state);
  const { resetFilters } = eventsFilterPanelStore();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);

  useEffect(() => {
    if (prevBranch.current !== selectedBranchState?.id) {
      prevBranch.current = selectedBranchState?.id;
      handleCloseAside();
      resetFilters();
    }
  }, [selectedBranchState?.id, handleCloseAside, resetFilters]);

  const handleOpenInfo = (id: string | number) => {
    handleClickRow(id);
  };

  const handleCloseInfo = () => {
    handleCloseAside();
  };

  return (
    <>
      {isMobile || isTablet ? <div style={{ height: '50px' }} /> : null}

      <PageWrapper
        style={{
          height: isMobile || isTablet ? 'calc(100vh - 60px)' : 'auto',
          overflow: 'auto',
        }}>
        <EventsTable
          handleClickRow={handleOpenInfo}
          handleCloseInfo={handleCloseInfo}
          prevBranch={prevBranch.current}
        />
      </PageWrapper>

      {isAsideOpen && selectedEventId && (
        <Aside
          onClose={handleCloseInfo}
          fullScreenOnMobile
          style={
            isMobile || isTablet
              ? {
                  width: '95vw',
                  maxWidth: '95vw',
                  right: '2.5vw',
                  left: '2.5vw',
                  top: '60px',
                  height: 'calc(100vh - 70px)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  zIndex: 1300,
                  overflow: 'hidden',
                }
              : {}
          }>
          <div
            style={
              isMobile || isTablet
                ? {
                    height: '100%',
                    overflow: 'auto',
                    padding: '8px',
                  }
                : {}
            }>
            <RowTableInfo
              tabs={tabs}
              activeTab={activeTab === 'additionalData' ? 1 : 0}
              onTabChange={(index) => setActiveTab(index === 1 ? 'additionalData' : 'info')}
            />
          </div>
        </Aside>
      )}
    </>
  );
};

export default Events;
