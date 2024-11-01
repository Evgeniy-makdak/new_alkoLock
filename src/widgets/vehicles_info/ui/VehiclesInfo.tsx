import { type FC } from 'react';

import { Stack } from '@mui/material';

import { Info } from '@entities/info';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Loader } from '@shared/ui/loader';

import { useVehiclesInfo } from '../hooks/useVehiclesInfo';

type VehiclesInfoProps = {
  selectedCarId: ID;
  closeTab: () => void;
};

export const VehiclesInfo: FC<VehiclesInfoProps> = ({ selectedCarId, closeTab }) => {
  const { isLoading, fields } = useVehiclesInfo(selectedCarId, closeTab);

  return (
    <Loader isLoading={isLoading}>
      <Stack padding={2}>
        <Info fields={fields} />
      </Stack>
    </Loader>
  );
};
