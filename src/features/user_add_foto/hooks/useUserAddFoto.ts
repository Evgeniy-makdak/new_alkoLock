import { useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import type { ImageState } from '@entities/upload_img';
import { StatusCode } from '@shared/const/statusCode';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useUserAddFotoApi } from '../api/useUserAddFotoApi';
import { userFotoStore } from '../model/userFotoStore';

export const useUserAddFoto = (userId: ID) => {
  const [uploadImage, setUploadImage] = useState<ImageState[]>([]);
  const [validImages, setValidImages] = useState<ImageState[]>([]); // Состояние для валидных фото

  const { imageHasUpload, setNotSavedImageInDataBase, imageHasNoUpload, usersImages } =
    userFotoStore();
  const { addPhoto, isLoading } = useUserAddFotoApi(userId);

  const reset = () => {
    setUploadImage([]);
    setValidImages([]); // Сброс валидных изображений
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

    const validImagesToUpload: ImageState[] = [];

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

          // Удаляем ошибочное изображение из состояния
          setUploadImage((prev) => prev.filter((img) => img.hash !== image.hash));
        } else {
          imageHasUpload(result?.data, userId);
          validImagesToUpload.push(image); // Добавляем валидное фото в массив
        }
      } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
      }
    });

    await Promise.all(uploadPromises);

    // Обновляем список валидных фото сразу
    setValidImages((prevValidImages) => [...prevValidImages, ...validImagesToUpload]);
  };

  return {
    uploadImage,
    validImages,
    setUploadImage,
    lengthMoreZero: uploadImage?.length > 0,
    isLoading,
    onSubmit,
    reset,
  };
};
