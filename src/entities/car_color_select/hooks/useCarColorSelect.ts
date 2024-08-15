import { mapOptions } from '@shared/ui/search_multiple_select';
import { CarsApi } from '@shared/api/baseQuerys'
import { useEffect, useState } from 'react';

export const useCarColorSelect = () => {
  const [colorCarList, setColorCarList] = useState<any[]>([]);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await CarsApi.getVehicleColors();
        const colors = response.data.map((color) => ({
          label: color.value,
          value: color.key
        }));

        setColorCarList(mapOptions(colors, (color) => [color.label, color.value]));
      } catch (error) {
        console.error('Ошибка при получении цветов:', error);
      }
    };

    fetchColors();
  }, []);

  return { colorCarList };
};
