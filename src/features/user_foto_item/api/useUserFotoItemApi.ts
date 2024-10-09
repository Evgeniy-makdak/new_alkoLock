import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

export const useUserFotoItemApi = (url: string, sendRequest: boolean, userId: ID) => {
  const updateQuery = useUpdateQueries();
  const { mutateAsync: deleteFotos, isPending } = useMutation({
    mutationFn: (fotos: string) => UsersApi.deletePhotosFromGallery(fotos),
    onSuccess: () => {
      updateQuery([QueryKeys.IMAGE_URL_LIST]);
    },
  });

  const {
    data: imageResponse,
    isLoading: isLoadingImage,
    isError,
  } = useConfiguredQuery([QueryKeys.IMAGE_ITEM], UsersApi.getPhotoFromGallery, {
    options: url,
    settings: {
      enabled: sendRequest,
    },
  });

  const { mutateAsync: changeAvatar, isPending: isLoadingChangeAvatar } = useMutation({
    mutationFn: (photoId: ID) => UsersApi.changeAvatarById(photoId, userId),
    onSuccess: () => {
      updateQuery([QueryKeys.AVATAR]);
    },
  });

  const id = imageResponse?.headers?.id;
  const isAvatar = imageResponse?.headers?.isavatar === 'true' ? true : false;
  const blob = imageResponse?.data;
  const hash = imageResponse?.headers['content-md5'] || [];
  // console.log('AAAAAAAAqKwA' + hash);
  console.log({imageResponse});
  
  
  return {
    image: {
      blob,
      isAvatar,
      id,
      hash,
      url,
    },
    isLoadingImage: isLoadingImage,
    deleteFotos,
    isDeleteImage: isPending,
    isError,
    changeAvatar,
    isLoadingChangeAvatar,
  };
};
