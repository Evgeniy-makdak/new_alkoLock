import { useEffect, useState } from 'react';

import { CarsApi } from '@shared/api/baseQuerys';
import { mapOptions } from '@shared/ui/search_multiple_select';

export const useCarColorSelect = () => {
  const [colorCarList, setColorCarList] = useState<any[]>([]);
  const [filteredColors, setFilteredColors] = useState<any[]>([]);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await CarsApi.getVehicleColors();
        const colors = response.data.map((color) => ({
          label: color.value,
          value: color.key,
        }));

        const mappedColors = mapOptions(colors, (color) => [color.label, color.value]);
        setColorCarList(mappedColors);
        setFilteredColors(mappedColors); 
      } catch (error) {
        console.error('Ошибка при получении цветов:', error);
      }
    };

    fetchColors();
  }, []);

  const onChange = (inputValue: string) => {
    if (inputValue) {
      const filtered = colorCarList.filter((color) =>
        color.label.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredColors(filtered);
    } else {
      setFilteredColors(colorCarList); 
    }
  };

  const onReset = () => {
    setFilteredColors(colorCarList); 
  };

  return { colorCarList: filteredColors, onChange, onReset };
};
