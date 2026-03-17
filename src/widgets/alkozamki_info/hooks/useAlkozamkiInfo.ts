/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ID } from '@shared/types/BaseQueryTypes';

import { useAlkozamkiInfoApi } from '../api/useAlkozamkiInfoApi';
import { getFields } from '../lib/getFields';

export const useAlkozamkiInfo = (id: ID, closeTab: () => void) => {
  const { t } = useTranslation();
  const { alkolock, isLoading, notFoundAlcolock, events } = useAlkozamkiInfoApi(id);
  const [activeDeviceIds, setActiveDeviceIds] = useState<number[]>([]);

  useEffect(() => {
    if (notFoundAlcolock) closeTab();
  }, [notFoundAlcolock, closeTab]);

  useEffect(() => {
    if (events?.content) {
      const deviceIds = events.content
        .map((item: { device: { id: any } }) => item.device?.id)
        .filter(Boolean) as number[];
      setActiveDeviceIds(deviceIds);
    }
  }, [events?.content]);

  const fields = getFields(alkolock, t);

  return { fields, isLoading, alkolock, activeDeviceIds };
};
