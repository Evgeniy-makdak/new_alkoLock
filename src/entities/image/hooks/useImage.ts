import { FilesUtils } from '@shared/utils/FilesUtils';

import { useImageApi } from '../api/useImageApi';

export const useImage = (url: string) => {
  const { data, isLoading } = useImageApi(url);
  const img = data?.data;

  return {
    img: FilesUtils.getUrlFromBlob(img),
    isLoading,
  };
};
