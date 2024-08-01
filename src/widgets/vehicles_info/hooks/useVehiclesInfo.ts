import { useEffect } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';

import { useVehiclesInfoApi } from '../api/useVehiclesInfoApi';
import { getFields } from '../lib/getFields';

export const useVehiclesInfo = (id: ID, closeTab: () => void) => {
  const { car, isLoading, notFoundCar } = useVehiclesInfoApi(id);

  useEffect(() => {
    if (notFoundCar) {
      closeTab();
    }
  }, [notFoundCar, closeTab]);
  const fields = getFields(car);
  return { isLoading, fields };
};
