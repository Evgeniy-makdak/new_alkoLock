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
 */
export function useUserAvatarQuery(userId: ID | undefined, user: IUser | undefined) {
  const queryClient = useQueryClient();
  const selectedBranchState = appStore((state) => state.selectedBranchState);
  const queryBranch = selectedBranchState?.id ?? null;
  const fileNameSuffix = getUserAvatarQueryFileName(user);
  const enabled = Boolean(userId);

  return useQuery({
    queryKey: [QueryKeys.AVATAR, queryBranch, userId, fileNameSuffix] as QueryKey,
    queryFn: () =>
      fetchUserAvatarWithFallback(userId as ID, queryClient, fileNameSuffix || undefined),
    enabled,
  });
}
