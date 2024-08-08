/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import type { ImageState } from '@entities/upload_img';
import { StatusCode } from '@shared/const/statusCode';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useUserAddFotoApi } from '../api/useUserAddFotoApi';
import { userFotoStore } from '../model/userFotoStore';

export const useUserAddFoto = (userId: ID) => {
  const [uploadImage, setUploadImage] = useState<ImageState[]>([]);
  const { imageHasUpload, setNotSavedImageInDataBase, imageHasNoUpload } = userFotoStore();
  const { addPhoto, isLoading } = useUserAddFotoApi(userId);
  const reset = () => {
    setUploadImage([]);
  };

  async function clearCache() {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
  }

  const onSubmit = async () => {
    setNotSavedImageInDataBase(uploadImage, userId);

    for (const image of uploadImage) {
      const reqBody = new FormData();
      reqBody.append('hash', image.hash);
      reqBody.append('image', image.image);

      const result = await addPhoto(reqBody);
      const status = result?.status;
      const message = result?.detail;
      const isErrorStatus =
        status === StatusCode.BAD_REQUEST ||
        status === StatusCode.SERVER_ERROR ||
        status === StatusCode.NOT_FOUND;
      if (result?.isError || isErrorStatus) {
        imageHasNoUpload(userId, message);
        clearCache();
        enqueueSnackbar(message, { variant: 'error' });
      } else {
        imageHasUpload(result?.data, userId);
      }
    }

    reset();
  };

  return {
    uploadImage,
    setUploadImage,
    lengthMoreZero: uploadImage?.length > 0,
    isLoading,
    onSubmit,
    reset,
  };
};
