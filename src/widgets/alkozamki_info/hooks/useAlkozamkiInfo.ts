import { useEffect } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';

import { useAlkozamkiInfoApi } from '../api/useAlkozamkiInfoApi';
import { getFields } from '../lib/getFields';

export const useAlkozamkiInfo = (id: ID, closeTab: () => void) => {
  const { alkolock, isLoading, notFoundAlcolock } = useAlkozamkiInfoApi(id);

  useEffect(() => {
    if (notFoundAlcolock) closeTab();
  }, [notFoundAlcolock, closeTab]);

  const fields = getFields(alkolock);

  return { fields, isLoading, alkolock };
};
