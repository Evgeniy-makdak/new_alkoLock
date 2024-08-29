import { AlcolocksApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { ID } from '@shared/types/BaseQueryTypes';

export const useAlkozamkiInfoApi = (id: ID) => {
  const {
    data: alcolockResponse,
    isLoading,
    error,
  } = useConfiguredQuery([QueryKeys.ALKOLOCK_ITEM], AlcolocksApi.getAlkolock, {
    options: id,
    settings: { enabled: !!id },
  });
  const notFoundAlcolock =
    error?.status === StatusCode.NOT_FOUND || alcolockResponse?.status === StatusCode.NOT_FOUND;
  return { alkolock: alcolockResponse?.data, isLoading, notFoundAlcolock };
};
