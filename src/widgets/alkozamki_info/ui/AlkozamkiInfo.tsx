import type { FC } from 'react';

import { Info } from '@entities/info';
import { AlkozamkiServiceMode } from '@features/alkozamki_service_mode';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Loader } from '@shared/ui/loader';

import { useAlkozamkiInfoApi } from '../api/useAlkozamkiInfoApi';
import { useAlkozamkiInfo } from '../hooks/useAlkozamkiInfo';
// 👈 добавляем импорт
import style from './AlkozamkiInfo.module.scss';

type AlkozamkiInfoProps = {
  closeTab: () => void;
  selectedAlcolockId: ID;
};

export const AlkozamkiInfo: FC<AlkozamkiInfoProps> = ({ selectedAlcolockId, closeTab }) => {
  const { alkolock, fields, isLoading, activeDeviceIds } = useAlkozamkiInfo(
    selectedAlcolockId,
    closeTab,
  );

  // 👇 получаем autoServiceType из useAlkozamkiInfoApi
  const { autoServiceType } = useAlkozamkiInfoApi(selectedAlcolockId);

  return (
    <Loader isLoading={isLoading}>
      <div className={style.alcolockInfo}>
        <Info fields={fields} />

        {alkolock && !!alkolock.vehicleBind && (
          <AlkozamkiServiceMode
            key={selectedAlcolockId}
            alkolock={alkolock}
            handleCloseAside={closeTab} // 👈 передаем функцию закрытия
            activeDeviceIds={activeDeviceIds}
            autoServiceType={autoServiceType} // 👈 передаем autoServiceType
          />
        )}
      </div>
    </Loader>
  );
};
