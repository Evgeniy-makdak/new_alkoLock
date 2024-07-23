import { RolesApi, UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { CreateUserData, ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.USER_LIST_TABLE, QueryKeys.USER_LIST, QueryKeys.USER_ITEM];

export const useUserAddChangeFormApi = (id: ID) => {
  const enabled = Boolean(id);

  const update = useUpdateQueries();
  const { data, isLoading } = useConfiguredQuery([QueryKeys.USER_ITEM], UsersApi.getUser, {
    options: id,
    settings: {
      enabled: enabled,
    },
  });
  // TODO => убрать запрос когда бэк начнет возвращать permissions в user
  const { data: userGroups, isLoading: isLoadingUserGroups } = useConfiguredQuery(
    [QueryKeys.ROLES_LIST],
    RolesApi.getList,
    {
      settings: {
        enabled: enabled,
        networkMode: 'offlineFirst',
      },
    },
  );

  const { data: foto, isLoading: isLoadingFoto } = useConfiguredQuery(
    [QueryKeys.AVATAR],
    UsersApi.getAvatar,
    {
      options: id,
      settings: {
        enabled: enabled,
        networkMode: 'offlineFirst',
      },
    },
  );

  const { mutateAsync: changeItem } = useMutation({
    mutationFn: (changeData: CreateUserData) => UsersApi.changeUser(changeData, id),
    onSuccess: () => update(updateQueries),
  });

  const { mutateAsync: createItem } = useMutation({
    mutationFn: (data: FormData) => UsersApi.createUser(data),
    onSuccess: () => update(updateQueries),
  });

  const { mutateAsync: changeFoto } = useMutation({
    mutationFn: (data: FormData) => UsersApi.changeAvatar(data, id),
  });

  const { mutateAsync: deleteFoto } = useMutation({
    mutationFn: () => UsersApi.deleteUserImages(id),
  });

  const hash = foto ? foto?.headers['content-md5'] : null;

  return {
    avatar: foto?.data && hash ? { img: foto?.data, hash } : null,
    groups: userGroups?.data,
    user: data?.data,
    isLoading: isLoading || isLoadingUserGroups || isLoadingFoto,
    changeItem,
    createItem,
    changeFoto,
    deleteFoto,
  };
};
