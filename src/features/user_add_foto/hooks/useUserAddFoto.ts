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
  const { imageHasUpload, setNotSavedImageInDataBase, imageHasNoUpload, usersImages } =
    userFotoStore();
  const { addPhoto, isLoading } = useUserAddFotoApi(userId);
  const reset = () => {
    setUploadImage([]);
  };

  const onSubmit = async () => {
    const existingImages = usersImages[userId] || [];

    // Фильтрация загружаемых изображений, чтобы не добавлять уже существующие
    const newImages = uploadImage.filter((image) => {
      const isDuplicate = existingImages.some((existingImage) => existingImage.hash === image.hash);
      if (isDuplicate) {
        const fileName = (image.image as File).name;
        enqueueSnackbar(`Фото ${fileName} уже существует в системе`, { variant: 'error' });
      }
      return !isDuplicate;
    });
    if (newImages.length === 0) {
      enqueueSnackbar('Нет новых фото для загрузки', { variant: 'warning' });
      return;
    }

    setNotSavedImageInDataBase(newImages, userId);

    for (const image of newImages) {
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
        enqueueSnackbar(message, { variant: 'error' });
      } else {
        setTimeout(() => {
          imageHasUpload(result?.data, userId);
        }, 0);
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
