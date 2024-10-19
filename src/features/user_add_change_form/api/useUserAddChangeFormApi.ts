import { RolesApi, UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [
  QueryKeys.USER_LIST_TABLE,
  QueryKeys.USER_LIST,
  QueryKeys.USER_ITEM,
  QueryKeys.AVATAR,
];

export const useUserAddChangeFormApi = (id: ID) => {
  const enabled = Boolean(id);

  const update = useUpdateQueries();

  // Получаем информацию о пользователе
  const { data, isLoading } = useConfiguredQuery([QueryKeys.USER_ITEM], UsersApi.getUser, {
    options: id,
    settings: {
      enabled: enabled,
    },
  });

  // Получаем список ролей (пользовательских групп)
  const { data: userGroups, isLoading: isLoadingUserGroups } = useConfiguredQuery(
    [QueryKeys.ROLES_LIST],
    RolesApi.getList,
    {
      options: {
        page: 0,
        size: 25,
        sort: 'name',
        filters: {
          systemGenerated: true,
        },
      },
      settings: {
        enabled: true,
        networkMode: 'offlineFirst',
      },
    },
  );

  // Получаем аватар пользователя
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

  // Мутации для изменения данных пользователя, создания пользователя, изменения аватара и удаления фото
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

  // Получаем хеш аватара
  const hash = foto ? foto?.headers['content-md5'] : null;

  return {
    avatar: foto?.data && hash ? { img: foto?.data, hash } : null,
    groups: userGroups?.data,
    user: data?.data,
    isLoading: isLoading || isLoadingUserGroups || isLoadingFoto,
    changeItem,
    createItem,
    changeFoto,
    deleteUserFoto,
  };
};
