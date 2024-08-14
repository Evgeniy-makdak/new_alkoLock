import { useEffect, useState } from 'react';
import { ID } from '@shared/types/BaseQueryTypes';
import { CarsApi } from '@shared/api/baseQuerys'; // Импортируйте CarsApi из нужного пути
import { useVehiclesInfoApi } from '../api/useVehiclesInfoApi';
import { getFields } from '../lib/getFields';

export const useVehiclesInfo = (id: ID, closeTab: () => void) => {
  const { car, isLoading, notFoundCar } = useVehiclesInfoApi(id);
  const [colorMap, setColorMap] = useState<{ [key: string]: string }>({});
  const [loadingColors, setLoadingColors] = useState(true);

  interface Color {
    key: string;
    value: string;
  }

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await CarsApi.getVehicleColors();
        const colors = response.data as unknown as Color[];
        const colorMapping = colors.reduce<{ [key: string]: string }>((acc: { [x: string]: any; }, color: { key: string | number; value: any; }) => {
          acc[color.key] = color.value;
console.log(color);

          return acc;
        }, {});
        setColorMap(colorMapping);
      } catch (error) {
        console.error('Error fetching vehicle colors:', error);
      } finally {
        setLoadingColors(false);
      }
    };

    fetchColors();
  }, []);

  useEffect(() => {
    if (notFoundCar) {
      closeTab();
    }
  }, [notFoundCar, closeTab]);

  const fields = getFields({ ...car, color: colorMap[car?.color] });

  if (car && colorMap[car.color]) {
    car.color = colorMap[car.color];
  }

  return { isLoading: isLoading || loadingColors, fields };
};
