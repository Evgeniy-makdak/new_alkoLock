import { useTranslation } from 'react-i18next';

import type { ID } from '@shared/types/BaseQueryTypes';

import { useEventInfoApi } from '../api/useEventInfoApi';
import { getFields } from '../lib/getFields';

export const useEventInfo = (id: ID) => {
  const { t } = useTranslation();
  const { data, isLoading } = useEventInfoApi(id);
  const fields = getFields(data?.data, t);

  // Проверяем, есть ли поле с типом 'RESULT'
  const hasTemperatureSensor = fields.some((field) => field.type === 'RESULT');

  return {
    data: data?.data,
    isLoading,
    fields,
    hasTemperatureSensor,
  };
};
