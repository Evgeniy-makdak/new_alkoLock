import { useAutoServiceInfoApi } from '../api/useAutoServiceInfoApi';
import { getFields } from '../lib/getFields';

export const useAutoServiceInfo = (id: string | number) => {
  const { data, isLoading } = useAutoServiceInfoApi(id);
  const deviceAction = data?.data;
  const fields = getFields(deviceAction);

  return { deviceAction, fields, isLoading };
};
