import { Info } from '@entities/info';
import { AlkozamkiServiceMode } from '@features/alkozamki_service_mode';
import { Loader } from '@shared/ui/loader';

import { useAutoServiceInfo } from '../hooks/useAutoServiceInfo';
import style from './AutoServiceInfo.module.scss';

interface AutoServiceInfoProps {
  selectedId: string | number | null;
}

export const AutoServiceInfo = ({ selectedId }: AutoServiceInfoProps) => {
  const { deviceAction, fields, isLoading } = useAutoServiceInfo(selectedId);
  return (
    <Loader isLoading={isLoading}>
      <div className={style.autoServiceInfo}>
        <Info fields={fields} />

        {deviceAction?.device && (
          <AlkozamkiServiceMode alkolock={deviceAction?.device} deviceAction={deviceAction} />
        )}
      </div>
    </Loader>
  );
};
