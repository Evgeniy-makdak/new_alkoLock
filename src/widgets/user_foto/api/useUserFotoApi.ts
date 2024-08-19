import { useEffect } from 'react';

import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useUserFotoApi = (userId: ID) => {
  const {
    data: listUrl,
    isLoading: isLoadingListUrl,
    refetch,
  } = useConfiguredQuery([QueryKeys.IMAGE_URL_LIST], UsersApi.getPhotoUrlsFromGallery, {
    options: userId,
    settings: { enabled: !!userId },
  });
  useEffect(() => {
    const callback = () => {
      setTimeout(refetch, 500);
    };
    document.addEventListener('user_change_sucsess', callback);
    return () => {
      document.removeEventListener('user_change_sucsess', callback);
    };
  }, []);

  return { listUrl: listUrl?.data, isLoadingListUrl };
};
