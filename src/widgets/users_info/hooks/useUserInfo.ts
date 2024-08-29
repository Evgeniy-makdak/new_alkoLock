import { useEffect } from 'react';

import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import { FilesUtils } from '@shared/utils/FilesUtils';

import { useUserInfoApi } from '../api/useUserInfoApi';
import { getFields } from '../lib/getFields';

export const useUserInfo = (id: ID, closeTab: () => void) => {
  const [open, toggle] = useToggle();
  const { isLoading, userData, foto, notFoundUser } = useUserInfoApi(id);
  const src = foto?.size !== 0 ? FilesUtils.getUrlFromBlob(foto) : null;
  const fields = getFields(userData);

  useEffect(() => {
    if (notFoundUser) {
      closeTab();
    }
  }, [notFoundUser, closeTab]);

  // Условный рендеринг инициалов
  const firstLetter =
    userData && userData.surname && userData.firstName
      ? userData.surname[0] + userData.firstName[0]
      : null;

  return { fields, isLoading, src, open, toggle, firstLetter };
};
