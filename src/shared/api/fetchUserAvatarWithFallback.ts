import { QueryKeys } from '@shared/const/storageKeys';
import type { ID, IUser } from '@shared/types/BaseQueryTypes';
import type { QueryClient } from '@tanstack/react-query';

import type { AppAxiosResponse } from './baseQueryTypes';
import { UsersApi } from './baseQuerys';

function photoFileNameFromUser(user: IUser | undefined): string | undefined {
  if (!user) return undefined;
  const dto = user.userPhotoDTO ?? user.userPhoto;
  const name = dto?.fileName?.trim();
  return name || undefined;
}

/**
 * Бэк иногда отдаёт 200 и пустой blob на photos/photos/{userId} (например после PUT user),
 * при этом то же изображение открывается по photos/{fileName}.
 */
export async function fetchUserAvatarWithFallback(
  userId: ID,
  queryClient: QueryClient,
  fileNameHint?: string | null,
): Promise<AppAxiosResponse<Blob>> {
  const primary = await UsersApi.getAvatar(userId);
  if (primary?.data instanceof Blob && primary.data.size > 0 && !primary.isError) {
    return primary;
  }

  let fileName = fileNameHint?.trim() || undefined;
  if (!fileName) {
    const entries = queryClient.getQueriesData({ queryKey: [QueryKeys.USER_ITEM] });
    for (const [, cached] of entries) {
      const response = cached as AppAxiosResponse<IUser> | undefined;
      const u = response?.data;
      if (u != null && (u.id === userId || String(u.id) === String(userId))) {
        fileName = photoFileNameFromUser(u);
        break;
      }
    }
  }

  if (fileName) {
    const secondary = await UsersApi.getPhotoByFileName(fileName);
    if (secondary?.data instanceof Blob && secondary.data.size > 0 && !secondary.isError) {
      return secondary;
    }
  }

  return primary;
}

export function getUserAvatarQueryFileName(user: IUser | undefined): string {
  return photoFileNameFromUser(user) ?? '';
}
