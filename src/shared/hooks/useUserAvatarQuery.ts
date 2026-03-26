import {
  fetchUserAvatarWithFallback,
  getUserAvatarQueryFileName,
} from '@shared/api/fetchUserAvatarWithFallback';
import { QueryKeys } from '@shared/const/storageKeys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID, IUser } from '@shared/types/BaseQueryTypes';
import { type QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Аватар по userId с fallback на GET photos/{fileName}, если photos/photos/{userId} пустой.
 * При userPhotoDTO.default === false фото остаётся в галерее, но не является аватаром профиля — blob не запрашиваем
 * (иначе превью в форме/кэш с тем же fileName подставляют «лишнее» изображение).
 */
export function useUserAvatarQuery(userId: ID | undefined, user: IUser | undefined) {
  const queryClient = useQueryClient();
  const selectedBranchState = appStore((state) => state.selectedBranchState);
  const queryBranch = selectedBranchState?.id ?? null;
  const fileNameSuffix = getUserAvatarQueryFileName(user);
  const photo = user?.userPhotoDTO ?? user?.userPhoto;
  const skipBlobForNonDefaultProfile = photo !== undefined && photo.default === false;

  const enabled = Boolean(userId) && !skipBlobForNonDefaultProfile;
  /** Чтобы при смене default true/false не подставлялся кэш с тем же fileName */
  const defaultKey =
    photo?.default === undefined ? 'unset' : photo.default ? 'default' : 'notDefault';

  return useQuery({
    queryKey: [QueryKeys.AVATAR, queryBranch, userId, fileNameSuffix, defaultKey] as QueryKey,
    queryFn: () =>
      fetchUserAvatarWithFallback(userId as ID, queryClient, fileNameSuffix || undefined),
    enabled,
  });
}
