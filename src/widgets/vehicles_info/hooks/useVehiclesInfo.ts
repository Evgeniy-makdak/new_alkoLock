import { useEffect } from 'react';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useVehiclesInfoApi } from '../api/useVehiclesInfoApi';
import { getFields } from '../lib/getFields';
import { useVehicleColorsApi } from '@shared/hooks/useVehicleColorsApi';

export const useVehiclesInfo = (id: ID, closeTab: () => void) => {
  const { car, isLoading: carLoading, notFoundCar } = useVehiclesInfoApi(id);
  const { data: vehicleColors, isLoading: colorsLoading, error } = useVehicleColorsApi();

  useEffect(() => {
    if (notFoundCar) {
      closeTab();
    }
  }, [notFoundCar, closeTab]);

  useEffect(() => {
    console.log('Car data:', car);
    console.log('Vehicle Colors in useVehiclesInfo:', vehicleColors);
    console.log('Error fetching vehicle colors:', error);
  }, [car, vehicleColors, error]);

  const fields = car && vehicleColors ? getFields(car, vehicleColors) : [];

  return { isLoading: carLoading || colorsLoading, fields };
};
