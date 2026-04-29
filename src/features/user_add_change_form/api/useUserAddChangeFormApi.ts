/* eslint-disable @typescript-eslint/no-explicit-any */
import { userFotoStore } from '@features/user_add_foto/model/userFotoStore';
import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import { useUserAvatarQuery } from '@shared/hooks/useUserAvatarQuery';
import type { AddPhotoResponse, ID, IRole, IUser, IUserPhotoDTO } from '@shared/types/BaseQueryTypes';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

/** После createUser не трогаем глобально USER_ITEM — иначе refetch всех карточек и лишние GET (в т.ч. 404 по «старым» id в кэше) */
const updateQueriesAfterCreate = [QueryKeys.USER_LIST_TABLE, QueryKeys.USER_LIST, QueryKeys.AVATAR];

export const useUserAddChangeFormApi = (id: ID) => {
  const enabled = Boolean(id);

  const queryClient = useQueryClient();
  const update = useUpdateQueries();

  const { data, isLoading } = useConfiguredQuery([QueryKeys.USER_ITEM], UsersApi.getUser, {
    options: id,
    settings: {
      enabled: enabled,
    } as any,
  });

  const user = data?.data;

  const { data: foto, isLoading: isLoadingFoto } = useUserAvatarQuery(id, user);

  const { mutateAsync: changeItem } = useMutation<AppAxiosResponse<IUser>, unknown, FormData>({
    mutationFn: (data: FormData) =>
      UsersApi.changeUser(data, id) as Promise<AppAxiosResponse<IUser>>,
    onSuccess: async (response) => {
      const putUser = response?.data;
      if (putUser?.id) {
        // Сразу подставляем тело ответа PUT в кэш карточки пользователя (превью в сайдбаре, ключ AVATAR).
        queryClient.setQueriesData({ queryKey: [QueryKeys.USER_ITEM] }, (old: any) => {
          if (!old?.data || old.data.id !== putUser.id) return old;
          return {
            ...old,
            data: { ...old.data, ...putUser },
          };
        });

        const photoMetaForGallery = getUserPhotoMeta(putUser);
        if (photoMetaForGallery !== undefined) {
          userFotoStore.getState().syncGalleryAvatarFromUserPhoto(putUser.id, photoMetaForGallery);
        }
      }

      await Promise.all(
        updateQueries.map((key) => queryClient.refetchQueries({ queryKey: [key] })),
      );

      // GET user после PUT иногда не отдаёт userPhotoDTO — восстанавливаем из ответа PUT
      const photo = putUser ? getUserPhotoMeta(putUser) : undefined;
      if (putUser?.id && photo) {
        queryClient.setQueriesData({ queryKey: [QueryKeys.USER_ITEM] }, (old: any) => {
          if (!old?.data || old.data.id !== putUser.id) return old;
          if (old.data.userPhotoDTO || old.data.userPhoto) return old;
          return {
            ...old,
            data: {
              ...old.data,
              userPhotoDTO: photo,
            },
          };
        });
      }

      await queryClient.invalidateQueries({ queryKey: [QueryKeys.IMAGE_ITEM] });
    },
  });

  /** POST галереи: userId передаётся явно (редактирование и только что созданный пользователь) */
  const { mutateAsync: addGalleryPhoto } = useMutation<
    AppAxiosResponse<AddPhotoResponse>,
    unknown,
    { formData: FormData; userId: ID }
  >({
    mutationFn: ({ formData, userId }) =>
      UsersApi.addPhoto(formData, userId) as Promise<AppAxiosResponse<AddPhotoResponse>>,
  });

  const { mutateAsync: createItem } = useMutation({
    mutationFn: (data: FormData) => UsersApi.createUser(data),
    onSuccess: () => update(updateQueriesAfterCreate),
  });

  const { mutateAsync: changeFoto } = useMutation({
    mutationFn: (data: FormData) => UsersApi.changeAvatar(data, id),
    onSuccess: () => update(updateQueries),
  });

  const { mutateAsync: deleteUserFoto } = useMutation({
    mutationFn: (data: FormData) => UsersApi.deleteUserImages(data, id),
    onSuccess: () => update(updateQueries),
  });

  const headerMd5 = getContentMd5FromResponse(foto);
  const blob = foto?.data;
  const hasBlob = Boolean(blob && blob.size > 0);
  const hash = resolveAvatarHashForForm(user, headerMd5, hasBlob);

  return {
    avatar: hasBlob && hash ? { img: blob, hash } : null,
    // Чипы и флаги прав берём из ответа api/users/{id}. Доп. запросы api/user-groups не нужны.
    groups: null as IRole[] | null,
    user,
    isLoading:
      isLoading ||
      isLoadingFoto,
    changeItem,
    addGalleryPhoto,
    createItem,
    changeFoto,
    deleteUserFoto,
  };
};
