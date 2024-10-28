import { useCallback, useEffect, useState } from 'react';

import type { ImageStateInStore } from '@entities/upload_img';
import { userFotoStore } from '@features/user_add_foto/model/userFotoStore';
import { QueryKeys } from '@shared/const/storageKeys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useQueryClient } from '@tanstack/react-query';

import { useUserFotoApi } from '../api/useUserFotoApi';

export const useUserFoto = (userId: ID) => {
  const [selectImg, setSelectImg] = useState(null);

  const { isLoadingListUrl, listUrl } = useUserFotoApi(userId);

  const images = userFotoStore((state) => state.usersImages[userId]) || [];
  const getUserImages = userFotoStore((state) => state.getUserImages);
  const setImageToStoreAfterLoading = userFotoStore((state) => state.setImageToStoreAfterLoading);
  const deleteImage = userFotoStore((state) => state.deleteImage);
  const changeAvatar = userFotoStore((state) => state.changeAvatar);

  const setImageToStoreAfterLoadingMemo = useCallback(
    (image: ImageStateInStore) => setImageToStoreAfterLoading(image, userId),
    [userId],
  );
  const changeAvatarMemo = useCallback(
    (idImage: ID, isAvatar?: boolean) => changeAvatar(idImage, userId, isAvatar),
    [userId],
  );
  const client = useQueryClient();
  const deleteImageMemo = useCallback(
    (imageID: ID) => {
      deleteImage(imageID, userId);
      client.resetQueries({ queryKey: [QueryKeys.AVATAR] });
    },
    [userId],
  );

  useEffect(() => {
    if (!userId || !listUrl || isLoadingListUrl) return;
// console.log('listUrl', listUrl);

    getUserImages(
      listUrl?.map((item) => item.body), // listUrl?.map((item) => item.hash
      userId,
    );
  }, [listUrl?.length, isLoadingListUrl]);

  return {
    open: Boolean(selectImg),
    selectImg,
    setSelectImg,
    images,
    isLoadingListUrl,
    setImageToStoreAfterLoadingMemo,
    deleteImageMemo,
    changeAvatarMemo,
  };
};
