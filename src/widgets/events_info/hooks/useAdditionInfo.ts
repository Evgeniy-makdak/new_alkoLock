import { useTranslation } from 'react-i18next';

import type { ID } from '@shared/types/BaseQueryTypes';

import { useEventInfoApi } from '../api/useEventInfoApi';
import { getAdditionFields } from '../lib/getAdditionFields';

export const useAdditionInfo = (id: ID) => {
  const { t } = useTranslation();
  const { data, isLoading } = useEventInfoApi(id);
  const fields = getAdditionFields(data?.data, t);
  const hasTemperatureSensor = fields.some((field) => field.type === 'TEMPERATURE');

  return { data: data?.data, isLoading, fields, hasTemperatureSensor };
};
