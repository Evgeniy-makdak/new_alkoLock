import { useEffect } from 'react';

import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import { FilesUtils } from '@shared/utils/FilesUtils';

import { useUserInfoApi } from '../api/useUserInfoApi';
import { getFields } from '../lib/getFields';

export const useUserInfo = (id: ID, closeTab: () => void) => {
  const [open, toggle] = useToggle();
  const { isLoading, userData, foto, notFoundUser } = useUserInfoApi(id);
  const src = FilesUtils.getUrlFromBlob(foto);
  const fields = getFields(userData);

  useEffect(() => {
    if (notFoundUser) {
      closeTab();
    }
  }, [notFoundUser, closeTab]);

  const firstLetter = (userData?.firstName?.[0] || userData?.middleName?.[0])?.toUpperCase();
  return { fields, isLoading, src, open, toggle, firstLetter };
};
