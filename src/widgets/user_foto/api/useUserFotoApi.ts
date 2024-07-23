import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useUserFotoApi = (userId: ID) => {
  const { data: listUrl, isLoading: isLoadingListUrl } = useConfiguredQuery(
    [QueryKeys.IMAGE_URL_LIST],
    UsersApi.getPhotoUrlsFromGallery,
    {
      options: userId,
      settings: { enabled: !!userId },
    },
  );

  return { listUrl: listUrl?.data, isLoadingListUrl };
};
