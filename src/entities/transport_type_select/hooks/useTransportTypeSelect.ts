import { useEffect, useState } from 'react';

import { CarsApi } from '@shared/api/baseQuerys';
import { mapOptions } from '@shared/ui/search_multiple_select';

export const useTransportTypeSelect = () => {
  const [typeTransportList, setTypeTransportList] = useState<any[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<any[]>([]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await CarsApi.getVehicleTypes();
        const types = response.data.map((type) => ({
          label: type.value,
          value: type.key,
        }));

        const mappedTypes = mapOptions(types, (type) => [type.label, type.value]);
        setTypeTransportList(mappedTypes);
        setFilteredTypes(mappedTypes);
      } catch (error) {
        console.error('Ошибка при получении типов:', error);
      }
    };

    fetchTypes();
  }, []);

  const onChange = (inputValue: string) => {
    if (inputValue) {
      const filtered = typeTransportList.filter((type) =>
        type.label.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredTypes(filtered);
    } else {
      setFilteredTypes(typeTransportList);
    }
  };

  const onReset = () => {
    setFilteredTypes(typeTransportList);
  };

  return { typeTransportList, filteredTypes, onChange, onReset };
};
