import { AccountApi, EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';

export const useNavBarApi = () => {
  const {
    data,
    isLoading: isLoadingAccountData,
    error,
    refetch: refetchAccountData,
  } = useConfiguredQuery([QueryKeys.ACCOUNT], AccountApi.getAccountData, {
    settings: {
      networkMode: 'offlineFirst',
    },
    triggerOnBranchChange: false,
  });
  // TODO => нужно заменить на ручку которая вернут просто кол-во событий
  // const { data: auto } = useConfiguredQuery(
  //   [QueryKeys.AUTO_SERVICE_EVENTS_LIST],
  //   EventsApi.getEventListForAutoService,
  //   {},
  // );

  const { data: count } = useConfiguredQuery(
    [QueryKeys.AUTO_SERVICE_COUNT_EVENTS_LIST],
    EventsApi.getEventListCountForAutoServiceURL,
    {},
  );

  return {
    refetchAccountData,
    userData: data?.data,
    isLoadingAccountData,
    length: count?.data || 0,
    error,
  };
};
