import { useEffect, useState } from 'react';

import { CarsApi } from '@shared/api/baseQuerys';
import { mapOptions } from '@shared/ui/search_multiple_select';

export const useTransportTypeSelect = () => {
  const [typeTransportList, setTypeTransportList] = useState<any[]>([]);
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await CarsApi.getVehicleTypes();
        const types = response.data.map((type) => ({
          label: type.value,
          value: type.key,
        }));

        setTypeTransportList(mapOptions(types, (type) => [type.label, type.value]));
      } catch (error) {
        console.error('Ошибка при получении цветов:', error);
      }
    };

    fetchTypes();
  }, []);

  return { typeTransportList };
};
