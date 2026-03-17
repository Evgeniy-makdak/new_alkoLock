import PhotosApi from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';

export const useImageApi = (url: string) => {
  const { data, isLoading } = useConfiguredQuery([QueryKeys.IMAGE], PhotosApi.getItem, {
    options: url,
  });

  return { data: data, isLoading };
};
