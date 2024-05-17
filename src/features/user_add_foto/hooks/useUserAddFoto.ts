/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';

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

  const onSubmit = async () => {
    setNotSavedImageInDataBase(uploadImage, userId);
    const reqBody = new FormData();
    for (const image of uploadImage) {
      reqBody.append('hash', image.hash);
      reqBody.append('image', image.image);
    }

    const result = await addPhoto(reqBody);
    const status = result?.status;
    const message = result?.message;
    const isErrorStatus =
      status === StatusCode.BAD_REQUEST ||
      status === StatusCode.SERVER_ERROR ||
      status === StatusCode.NOT_FOUND;
    if (result?.isError || isErrorStatus) {
      imageHasNoUpload(userId, message);
    } else {
      imageHasUpload(result?.data, userId);
      reset();
    }
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
