/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import type { ImageState } from '@entities/upload_img';
import { UsersApi } from '@shared/api/baseQuerys';
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

    const uploadPromises = newImages.map(async (image) => {
      const reqBody = new FormData();
      reqBody.append('hash', image.hash);
      reqBody.append('image', image.image);

      try {
        const result = await addPhoto(reqBody);

        if (result?.status >= StatusCode.BAD_REQUEST) {
          const message = result?.detail || 'Ошибка загрузки фото';
          imageHasNoUpload(userId, message);
          enqueueSnackbar(message, { variant: 'error' });
        } else {
          imageHasUpload(result?.data, userId);
          enqueueSnackbar('Фото успешно загружено', { variant: 'success' });

          // Логирование результата, чтобы увидеть точно, что в нём есть
          console.log('Результат загрузки фото:', result?.data);

          const photoUrl = result?.data[0]?.fileName;

          // Логируем значение photoUrl
          console.log('photoUrl:', photoUrl);

          if (photoUrl) {
            try {
              // Лог перед вызовом функции
              console.log('Вызов getPhotoFromGallery с photoUrl:', photoUrl);

              await UsersApi.getPhotoFromGallery(photoUrl);

              enqueueSnackbar('Фото загружено и обновлено из галереи', { variant: 'info' });
            } catch (error) {
              console.error('Ошибка при получении фото из галереи:', error);
              enqueueSnackbar('Ошибка при обновлении фото из галереи', { variant: 'error' });
            }
          } else {
            console.error('photoUrl отсутствует или пуст');
          }
        }
      } catch (error) {
        imageHasNoUpload(userId, 'Ошибка загрузки фото');
      }
    });

    const results = await Promise.allSettled(uploadPromises);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Ошибка загрузки фото ${newImages[index].hash}:`, result.reason);
      }
    });

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
