/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAutoServiceInfoApi } from '../api/useAutoServiceInfoApi';
import { getFields } from '../lib/getFields';

export const useAutoServiceInfo = (id: string | number | null, handleCloseAside?: () => void) => {
  const { t, i18n } = useTranslation();
  const { data, isLoading, events } = useAutoServiceInfoApi(id, handleCloseAside);
  const [activeDeviceIds, setActiveDeviceIds] = useState<number[]>([]);
  const deviceAction = data?.data;

  useEffect(() => {
    if (events?.content) {
      const deviceIds = events.content
        .map((item: { device: { id: any } }) => item.device?.id)
        .filter(Boolean) as number[];
      setActiveDeviceIds(deviceIds);
    }
  }, [events?.content]);

  const fields = useMemo(() => getFields(deviceAction, t), [deviceAction, t, i18n.language]);

  return { deviceAction, fields, isLoading, activeDeviceIds };
};
