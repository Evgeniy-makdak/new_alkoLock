import { useCallback } from 'react';

import { Info } from '@entities/info';
import { AlkozamkiServiceMode } from '@features/alkozamki_service_mode';
import { Loader } from '@shared/ui/loader';

import { useAutoServiceInfo } from '../hooks/useAutoServiceInfo';
import style from './AutoServiceInfo.module.scss';

interface AutoServiceInfoProps {
  selectedId: string | number | null;
  handleCloseAside: () => void;
}

export const AutoServiceInfo = ({ selectedId, handleCloseAside }: AutoServiceInfoProps) => {
  const stableHandleClose = useCallback(() => {
    handleCloseAside();
  }, [handleCloseAside]);

  const { deviceAction, fields, isLoading, activeDeviceIds } = useAutoServiceInfo(
    selectedId,
    stableHandleClose,
  );

  return (
    <Loader isLoading={isLoading} props={{ className: 'asideInfoFillPanel' }}>
      <div className={style.autoServiceInfoFill}>
        <div className={style.autoServiceInfo}>
          <div className={style.autoServiceInfoBody}>
            <Info fields={fields} />
          </div>

          {deviceAction?.device && (
            <div className={style.autoServiceInfoService}>
              <AlkozamkiServiceMode
                alkolock={deviceAction?.device}
                deviceAction={deviceAction}
                handleCloseAside={handleCloseAside}
                activeDeviceIds={activeDeviceIds}
              />
            </div>
          )}
        </div>
      </div>
    </Loader>
  );
};
