import { AppConstants } from '@app/index';
import { mapOptions } from '@shared/ui/search_multiple_select';

export const useTransportTypeSelect = () => {
  // TODO => должна быть ручка api а не хардкожен в массиве
  const typeTransportList = mapOptions(AppConstants.carTypesList, (data) => [
    data.label,
    data.value,
  ]);
  return { typeTransportList };
};
