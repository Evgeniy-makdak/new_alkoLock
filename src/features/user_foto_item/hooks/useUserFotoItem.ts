/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect } from 'react';

import { enqueueSnackbar } from 'notistack';

import { type ImageStateInStore } from '@entities/upload_img';
import { StatusCode } from '@shared/const/statusCode';
import type { ID } from '@shared/types/BaseQueryTypes';
import { FilesUtils } from '@shared/utils/FilesUtils';

import { useUserFotoItemApi } from '../api/useUserFotoItemApi';

export const useUserFotoItem = (
  image: ImageStateInStore,
  setImageToStoreAfterLoadingMemo: (image: ImageStateInStore) => void,
  deleteImage: (imageID: ID) => void,
  changeAvatarMemo: (idImage: ID) => void,
  userId: ID,
) => {
  const needSendRequest = Boolean(image?.url) && !image?.image && !image?.src;
  const {
    isLoadingChangeAvatar,
    image: imageRes,
    isLoadingImage,
    isError,
    deleteFotos,
    changeAvatar,
    isDeleteImage,
  } = useUserFotoItemApi(image?.url, needSendRequest, userId);

  useEffect(() => {
    if (!needSendRequest || !imageRes?.id || !imageRes?.blob) return;
    setImageToStoreAfterLoadingMemo({
      isSavedInDataBase: true,
      image: imageRes?.blob,
      src: FilesUtils.getUrlFromBlob(imageRes?.blob),
      hash: imageRes?.hash,
      id: imageRes?.id,
      url: image?.url,
      isAvatar: imageRes?.isAvatar,
    });
  }, [imageRes, needSendRequest]);

  async function clearCache() {
    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log(`Кэш ${cacheName} был удален`);
      }
    } catch (error) {
      console.error('Ошибка при очистке кэша:', error);
    }
  }

  const handleDeleteImage = async () => {
    const imageId = imageRes?.id || image?.id;
    if (!imageId) return;
    await clearCache();

    const res = await deleteFotos(imageId);
    if (res?.isError) {
      enqueueSnackbar('Ошибка удаления фотографии', { variant: 'error' });
      return;
    }
    deleteImage(image?.id);
  };

  const handleChangeAvatar = async () => {
    const imageId = imageRes?.id || image?.id;
    if (!imageId) return;
    await clearCache();

    const res = await changeAvatar(imageId);
    const isError = res?.isError || res?.status !== StatusCode.SUCCESS;
    if (isError) {
      enqueueSnackbar(res?.detail, { variant: 'error' });
      return;
    }
    changeAvatarMemo(image?.id);
  };

  return {
    isLoadingImage,
    handleDeleteImage,
    isError,
    isDeleteImage,
    handleChangeAvatar,
    isLoadingChangeAvatar,
  };
};
