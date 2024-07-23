import { AppConstants } from '@app/index';
import { mapOptions } from '@shared/ui/search_multiple_select';

export const useCarColorSelect = () => {
  // TODO => должна быть ручка api а не хардкожен в массиве
  const colorCarList = mapOptions(AppConstants.carColorsList, (color) => [
    color.label,
    color.value,
  ]);
  return { colorCarList };
};
