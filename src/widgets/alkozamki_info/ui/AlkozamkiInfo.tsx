import type { FC } from 'react';

import { Info } from '@entities/info';
import { AlkozamkiServiceMode } from '@features/alkozamki_service_mode';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Loader } from '@shared/ui/loader';

import { useAlkozamkiInfo } from '../hooks/useAlkozamkiInfo';
import style from './AlkozamkiInfo.module.scss';

type AlkozamkiInfoProps = {
  closeTab: () => void;
  selectedAlcolockId: ID;
};

export const AlkozamkiInfo: FC<AlkozamkiInfoProps> = ({ selectedAlcolockId, closeTab }) => {
  const { alkolock, fields, isLoading } = useAlkozamkiInfo(selectedAlcolockId, closeTab);
  return (
    <Loader isLoading={isLoading}>
      <div className={style.alcolockInfo}>
        <Info fields={fields} />

        {alkolock && !!alkolock.vehicleBind && <AlkozamkiServiceMode alkolock={alkolock} />}
      </div>
    </Loader>
  );
};
