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

    // Создание массива для асинхронной обработки загрузки каждого изображения
    const uploadPromises = newImages.map(async (image) => {
      const reqBody = new FormData();
      reqBody.append('hash', image.hash);
      reqBody.append('image', image.image);

      try {
        const result = await addPhoto(reqBody);
        const status = result?.status;
        const isErrorStatus =
          status === StatusCode.BAD_REQUEST ||
          status === StatusCode.SERVER_ERROR ||
          status === StatusCode.NOT_FOUND;

        if (isErrorStatus || result?.isError) {
          const message = result?.detail || 'Ошибка загрузки фото';
          imageHasNoUpload(userId, message);
          enqueueSnackbar(message, { variant: 'error' });
        } else {
          // Обновляем галерею пользователя сразу после успешной загрузки изображения
          imageHasUpload(result?.data, userId);
        }
      } catch (error) {
        enqueueSnackbar('Ошибка загрузки фото', { variant: 'error' });
      }
    });

    // Ожидание загрузки всех изображений
    await Promise.all(uploadPromises);

    // Сброс формы после завершения всех операций
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
