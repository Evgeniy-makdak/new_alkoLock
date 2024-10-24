import type { ID } from '@shared/types/BaseQueryTypes';

import { useHistoryInfoApi } from '../api/useHistoryInfoApi';
import { getFields } from '../lib/getFields';

export const useHistoryInfo = (id: ID) => {
  const { data, isLoading } = useHistoryInfoApi(id);
  const fields = getFields(data?.data);
  return { data: data?.data, isLoading, fields };
};
