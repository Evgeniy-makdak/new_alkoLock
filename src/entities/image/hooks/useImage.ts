import { useMemo } from 'react';

import { FilesUtils } from '@shared/utils/FilesUtils';

import { useImageApi } from '../api/useImageApi';

export const useImage = (url: string) => {
  const { data, isLoading } = useImageApi(url);
  const img = data?.data;

  const imgUrl = useMemo(() => FilesUtils.getUrlFromBlob(img), [img]);

  return {
    img: imgUrl,
    isLoading,
  };
};
