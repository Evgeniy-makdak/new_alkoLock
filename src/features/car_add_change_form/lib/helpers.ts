import { AppConstants } from '@app/index';
import type { Values } from '@shared/ui/search_multiple_select';

export const colorSelectValueFormatter = (value: string): Values => {
  return AppConstants.carColorsList.filter((item) => item.value === value);
};

export const typeSelectValueFormatter = (value: string): Values =>
  AppConstants.carTypesList.filter((item) => item.value === value);
