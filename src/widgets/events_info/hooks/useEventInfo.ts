import type { ID } from '@shared/types/BaseQueryTypes';

import { useEventInfoApi } from '../api/useEventInfoApi';
import { getFields } from '../lib/getFields';

export const useEventInfo = (id: ID) => {
  const { data, isLoading } = useEventInfoApi(id);
  const fields = getFields(data?.data);
  return { data: data?.data, isLoading, fields };
};
