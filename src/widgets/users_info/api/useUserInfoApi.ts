import { UsersApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useUserInfoApi = (id: ID) => {
  const enabled = Boolean(id);
  const {
    data: userInfo,
    isLoading,
    error,
  } = useConfiguredQuery([QueryKeys.USER_ITEM], UsersApi.getUser, {
    options: id,
    settings: {
      enabled: enabled,
    },
  });
  const { data: avatar } = useConfiguredQuery([QueryKeys.AVATAR], UsersApi.getAvatar, {
    options: id,
    settings: {
      enabled: enabled,
    },
  });

  console.log(userInfo);
  console.log(avatar);
  
  

  const notFoundUser =
    error?.status === StatusCode.NOT_FOUND || userInfo?.status === StatusCode.NOT_FOUND;
  return { userData: userInfo?.data, isLoading, foto: avatar?.data, notFoundUser };
};
