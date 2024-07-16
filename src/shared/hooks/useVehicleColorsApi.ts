import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { VehicleColor } from '@shared/types/ColorTypes';

const fetchVehicleColors = async (): Promise<VehicleColor[]> => {
  try {
    console.log('Fetching vehicle colors...');
    const response = await axios.get('/api/v1/front-data/vehicle-color');
    console.log('Vehicle colors response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicle colors:', error);
    throw error;
  }
};

export const useVehicleColorsApi = () => {
  const queryResult = useQuery<VehicleColor[]>({
    queryKey: ['vehicleColors'],
    queryFn: fetchVehicleColors,
  });

  console.log('Query result:', queryResult);

  return queryResult;
};
