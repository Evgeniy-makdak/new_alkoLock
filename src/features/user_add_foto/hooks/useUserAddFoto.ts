import { useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import type { ImageState } from '@entities/upload_img';
import type { ImageStateInStore } from '@entities/upload_img/index';
import { StatusCode } from '@shared/const/statusCode';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useUserAddFotoApi } from '../api/useUserAddFotoApi';
import { userFotoStore } from '../model/userFotoStore';

export const useUserAddFoto = (userId: ID) => {
  const [uploadImage, setUploadImage] = useState<ImageState[]>([]);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const {
    imageHasUpload,
    setNotSavedImageInDataBase,
    // imageHasNoUpload,
    usersImages,
    updateUserImages,
  } = userFotoStore();

  const { addPhoto, isLoading } = useUserAddFotoApi(userId);

  const reset = () => {
    setUploadImage([]);
    setLoadingImages(new Set());
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

    for (const image of newImages) {
      const reqBody = new FormData();
      reqBody.append('hash', image.hash);
      reqBody.append('image', image.image);
      setLoadingImages((prev) => new Set(prev).add(image.hash));

      let result;

      try {
        result = await addPhoto(reqBody);

        if (result?.status === StatusCode.BAD_REQUEST) {
          const message = result?.detail;
          enqueueSnackbar(message, { variant: 'error' });
          setUploadImage((prev) => prev.filter((img) => img.hash !== image.hash));
          setLoadingImages((prev) => {
            const newLoadingImages = new Set(prev);
            newLoadingImages.delete(image.hash);
            return newLoadingImages;
          });
        } else {
          imageHasUpload(result?.data, userId);
          validImagesToUpload.push(image);
        }
      } catch (error) {
        enqueueSnackbar('Ошибка сети при загрузке', { variant: 'error' });
      } finally {
        if (result?.status === StatusCode.BAD_REQUEST) {
          setUploadImage((prev) => prev.filter((img) => img.hash !== image.hash));
          setLoadingImages((prev) => {
            const newLoadingImages = new Set(prev);
            newLoadingImages.delete(image.hash);
            return newLoadingImages;
          });
          // userFotoStore.getState().imageHasNoUpload(userId);
        }
      }
    }

    const validImagesInStore: ImageStateInStore[] = validImagesToUpload.map((image) => ({
      ...image,
      isSavedInDataBase: true,
      isAvatar: false,
    }));
    // window.location.reload();
    updateUserImages(userId, validImagesInStore);
    reset();
  };

  return {
    uploadImage,
    setUploadImage,
    loadingImages,
    lengthMoreZero: uploadImage?.length > 0,
    isLoading,
    onSubmit,
    reset,
  };
};
