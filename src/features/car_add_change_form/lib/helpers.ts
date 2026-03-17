import { CarsApi } from '@shared/api/baseQuerys';
import { type Values, mapOptions } from '@shared/ui/search_multiple_select';

export const colorSelectValueFormatter = (value: string): Values => {
  return carColors.filter((item) => item.value === value);
};

export const typeSelectValueFormatter = (value: string): Values =>
  carTypes.filter((item) => item.value === value);

let carColors: Values = [];

const fetchColors = async () => {
  try {
    const response = await CarsApi.getVehicleColors();
    // Добавляем проверку на существование response.data
    const colorsData = response?.data || [];
    const colors = colorsData.map((color: { key: string; value: string }) => ({
      label: color.value,
      value: color.key,
    }));
    carColors = mapOptions(colors, (color) => [color.label, color.value]);
  } catch (error) {
    console.error('Error fetching colors:', error);
    carColors = [];
  }
};

fetchColors();

let carTypes: Values = [];

const fetchTypes = async () => {
  try {
    const response = await CarsApi.getVehicleTypes();
    // Добавляем проверку на существование response.data
    const typesData = response?.data || [];
    const types = typesData.map((type: { key: string; value: string }) => ({
      label: type.value,
      value: type.key,
    }));
    carTypes = mapOptions(types, (type) => [type.label, type.value]);
  } catch (error) {
    console.error('Error fetching types:', error);
    carTypes = [];
  }
};

fetchTypes();
