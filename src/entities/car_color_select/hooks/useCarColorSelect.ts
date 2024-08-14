import { useEffect, useState } from 'react';

import { CarsApi } from '@shared/api/baseQuerys';

interface ColorOption {
  key: string;
  value: string;
}

export const useCarColorSelect = () => {
  const [colorCarList, setColorCarList] = useState<string[]>([]);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = (await CarsApi.getVehicleColors()) as ColorOption[];
        const colors = response;

        const mappedColors = colors.map((color: { value: any }) => color.value);
        setColorCarList(mappedColors);
      } catch (error) {
        // console.error('Error fetching vehicle colors:', error);
      }
    };

    fetchColors();
  }, []);

  return { colorCarList };
};
