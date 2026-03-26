/* eslint-disable @typescript-eslint/no-explicit-any */
import { UsersApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUserAvatarQuery } from '@shared/hooks/useUserAvatarQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useUserInfoApi = (id: ID) => {
  const enabled = Boolean(id);
  const {
    data: userInfo,
    isLoading: isLoadingUser,
    error,
  } = useConfiguredQuery([QueryKeys.USER_ITEM], UsersApi.getUser, {
    options: id,
    settings: {
      enabled: enabled,
    } as any,
  });
  const userData = userInfo?.data;
  const { data: avatar, isLoading: isLoadingAvatar } = useUserAvatarQuery(id, userData);

  const notFoundUser =
    error?.status === StatusCode.NOT_FOUND || userInfo?.status === StatusCode.NOT_FOUND;
  return {
    userData,
    isLoading: isLoadingUser || isLoadingAvatar,
    foto: avatar?.data,
    notFoundUser,
  };
};
