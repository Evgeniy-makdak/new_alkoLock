import { useRef } from 'react';

import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { Aside } from '@shared/ui/aside';
import { VehiclesTable } from '@widgets/vehicles_table';

import { useVehicles } from '../hooks/useVehicles';

const Vehicles = () => {
  const prevBranch = useRef(null);
  const {
    handleCloseAside,
    onClickRow,
    tabs,
    selectedCarId,
    targetPageFromNavigation,
    returnNavigation,
    handleReturnToOrigin,
    onTargetPageApplied,
  } = useVehicles();
  const { selectedBranchState } = appStore((state) => state);

  const handleBranchChange = () => {
    const event = new CustomEvent('resetFilters'); // Генерируем событие сброса фильтров
    window.dispatchEvent(event);
  };

  if (prevBranch.current === null) {
    // Первый рендер: фиксируем филиал без сброса состояния,
    // чтобы не потерять selectedId при переходе из Алкозамков.
    prevBranch.current = selectedBranchState?.id;
  } else if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
    handleCloseAside();
    handleBranchChange();
  }

  return (
    <>
      <PageWrapper>
        <VehiclesTable
          onClickRow={onClickRow}
          onBranchChange={handleBranchChange}
          handleCloseAside={handleCloseAside}
          selectedCarId={selectedCarId}
          targetPageFromNavigation={targetPageFromNavigation}
          onTargetPageApplied={onTargetPageApplied}
          prevBranch={prevBranch.current}
        />
      </PageWrapper>

      {selectedCarId && (
        <Aside
          onClose={handleCloseAside}
          onReturnToOrigin={returnNavigation ? handleReturnToOrigin : undefined}
          fullScreenOnMobile>
          <RowTableInfo tabs={tabs} />
        </Aside>
      )}
    </>
  );
};

export default Vehicles;
