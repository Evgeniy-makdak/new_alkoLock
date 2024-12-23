import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';
import { useRolesSelectApi } from '@entities/roles_select/api/useRolesSelectApi';

const updateQueries = [
  QueryKeys.USER_LIST_TABLE,
  QueryKeys.USER_LIST,
  QueryKeys.USER_ITEM,
  QueryKeys.AVATAR,
];

export const useUserAddChangeFormApi = (id: ID) => {
  const enabled = Boolean(id);

  const update = useUpdateQueries();

  const { data, isLoading } = useConfiguredQuery([QueryKeys.USER_ITEM], UsersApi.getUser, {
    options: id,
    settings: {
      enabled: enabled,
    },
  });

  const { data: userGroups, isLoading: isLoadingUserGroups } = useRolesSelectApi({
    page: 0,
    size: 25,
    sort: 'name',
    filters: {
      systemGenerated: true,
    },
  });

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
    mutationFn: (data: FormData) => UsersApi.changeUser(data, id),
    onSuccess: () => update(updateQueries),
  });

  const { mutateAsync: createItem } = useMutation({
    mutationFn: (data: FormData) => UsersApi.createUser(data),
    onSuccess: () => update(updateQueries),
  });

  const { mutateAsync: changeFoto } = useMutation({
    mutationFn: (data: FormData) => UsersApi.changeAvatar(data, id),
    onSuccess: () => update(updateQueries),
  });

  const { mutateAsync: deleteUserFoto } = useMutation({
    mutationFn: (data: FormData) => UsersApi.deleteUserImages(data, id),
    onSuccess: () => update(updateQueries),
  });

  const hash = foto ? foto?.headers['content-md5'] : null;

  return {
    avatar: foto?.data && hash ? { img: foto?.data, hash } : null,
    groups: userGroups,
    user: data?.data,
    isLoading: isLoading || isLoadingUserGroups || isLoadingFoto,
    changeItem,
    createItem,
    changeFoto,
    deleteUserFoto,
  };
};
