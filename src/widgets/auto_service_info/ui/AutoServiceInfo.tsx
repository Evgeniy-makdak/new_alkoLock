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
  const { deviceAction, fields, isLoading } = useAutoServiceInfo(selectedId);
  console.log(deviceAction);
  
  return (
    <Loader isLoading={isLoading}>
      <div className={style.autoServiceInfo}>
        <Info fields={fields} />

        {deviceAction?.device && (
          <AlkozamkiServiceMode alkolock={deviceAction?.device} deviceAction={deviceAction} handleCloseAside={handleCloseAside}  />
        )}
      </div>
    </Loader>
  );
};
