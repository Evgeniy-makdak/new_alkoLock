import { useEffect, useState } from 'react';

import { CarsApi } from '@shared/api/baseQuerys';
import { ID } from '@shared/types/BaseQueryTypes';

import { useVehiclesInfoApi } from '../api/useVehiclesInfoApi';
import { getFields } from '../lib/getFields';

export const useVehiclesInfo = (id: ID, closeTab: () => void) => {
  const { car, isLoading, notFoundCar } = useVehiclesInfoApi(id);
  const [colorMap, setColorMap] = useState<{ [key: string]: string }>({});
  const [loadingColors, setLoadingColors] = useState(true);
  const [typeMap, setTypeMap] = useState<{ [key: string]: string }>({});
  const [loadingTypes, setLoadingTypes] = useState(true);

  interface Color {
    key: string;
    value: string;
  }

  interface Type {
    key: string;
    value: string;
  }

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await CarsApi.getVehicleColors();
        const colors = response.data as unknown as Color[];
        const colorMapping = colors.reduce<{ [key: string]: string }>(
          (acc: { [x: string]: any }, color: { key: string | number; value: any }) => {
            acc[color.key] = color.value;
            return acc;
          },
          {},
        );
        setColorMap(colorMapping);
      } catch (error) {
        console.error('Error fetching vehicle colors:', error);
      } finally {
        setLoadingColors(false);
      }
    };

    const fetchTypes = async () => {
      try {
        const response = await CarsApi.getVehicleTypes();
        const types = response.data as unknown as Type[];
        const typeMapping = types.reduce<{ [key: string]: string }>(
          (acc: { [x: string]: any }, type: { key: string | number; value: any }) => {
            acc[type.key] = type.value;
            return acc;
          },
          {},
        );
        setTypeMap(typeMapping);
      } catch (error) {
        console.error('Error fetching vehicle types:', error);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchColors();
    fetchTypes();
  }, []);

  useEffect(() => {
    if (notFoundCar) {
      closeTab();
    }
  }, [notFoundCar, closeTab]);

  const fields = getFields({ ...car, color: colorMap[car?.color], type: typeMap[car?.type] });

  if (car && colorMap[car.color]) {
    car.color = colorMap[car.color];
  }

  if (car && typeMap[car.type]) {
    car.type = typeMap[car.type];
  }

  return { isLoading: isLoading || loadingColors || loadingTypes, fields };
};
