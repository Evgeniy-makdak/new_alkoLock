import { CarsApi } from '@shared/api/baseQuerys';
import { type Values, mapOptions } from '@shared/ui/search_multiple_select';

export const colorSelectValueFormatter = (value: string): Values => {
  return carColors.filter((item) => item.value === value);
};

export const typeSelectValueFormatter = (value: string): Values =>
  carTypes.filter((item) => item.value === value);

let carColors: Values = [];

const fetchColors = async () => {
  const response = await CarsApi.getVehicleColors();
  const colors = response.data.map((color: { key: string; value: string }) => ({
    label: color.value,
    value: color.key,
  }));
  carColors = mapOptions(colors, (color) => [color.label, color.value]);
};

fetchColors();

let carTypes: Values = [];

const fetchTypes = async () => {
  const response = await CarsApi.getVehicleTypes();
  const types = response.data.map((type: { key: string; value: string }) => ({
    label: type.value,
    value: type.key,
  }));
  carTypes = mapOptions(types, (type) => [type.label, type.value]);
};

fetchTypes();
