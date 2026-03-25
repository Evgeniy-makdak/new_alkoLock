/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRolesSelectApi } from '@entities/roles_select/api/useRolesSelectApi';
import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID, IUser, IUserPhotoDTO } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

function getUserPhotoMeta(user: IUser | undefined): IUserPhotoDTO | undefined {
  if (!user) return undefined;
  return user.userPhotoDTO ?? user.userPhoto;
}

/** Hash для превью в форме: сайдбар рисует blob без hash, здесь без строки ImageState не заполняется */
function resolveAvatarHashForForm(
  user: IUser | undefined,
  headerMd5: string | null,
  hasBlob: boolean,
): string | null {
  if (!hasBlob) return null;
  const dto = getUserPhotoMeta(user);
  return (
    headerMd5 ??
    dto?.hash ??
    (dto?.fileName ? `fn:${dto.fileName}` : null) ??
    (dto?.id != null ? `photoId:${dto.id}` : null) ??
    (user?.id != null ? `user:${user.id}` : null) ??
    'existing'
  );
}

function getContentMd5FromResponse(foto: AppAxiosResponse<Blob> | undefined): string | null {
  const headers = foto?.headers;
  if (!headers) return null;
  if (typeof (headers as { get?: (k: string) => string | undefined }).get === 'function') {
    const h = headers as { get: (k: string) => string | undefined };
    const fromGet = h.get('content-md5') ?? h.get('Content-MD5');
    if (fromGet) return fromGet;
  }
  const rec = headers as Record<string, string>;
  return rec['content-md5'] ?? rec['Content-MD5'] ?? null;
}

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
    } as any,
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
      } as any,
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

  const user = data?.data;
  const headerMd5 = getContentMd5FromResponse(foto);
  const blob = foto?.data;
  const hasBlob = Boolean(blob && blob.size > 0);
  const hash = resolveAvatarHashForForm(user, headerMd5, hasBlob);

  return {
    avatar: hasBlob && hash ? { img: blob, hash } : null,
    groups: userGroups,
    user,
    isLoading: isLoading || isLoadingUserGroups || isLoadingFoto,
    changeItem,
    createItem,
    changeFoto,
    deleteUserFoto,
  };
};
