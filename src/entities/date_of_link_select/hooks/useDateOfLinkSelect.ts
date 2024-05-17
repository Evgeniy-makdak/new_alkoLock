import { useState } from 'react';

import { AttachmentsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useDateOfLinkSelect = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const onChange = (value: string) => {
    setSearchQuery(value);
  };
  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.ATTACHMENT_LIST],
    AttachmentsApi.getList,
    { options: searchQuery },
  );
  const onReset = () => {
    setSearchQuery('');
  };

  const dateCreate = mapOptions(data?.data, adapterMapOptions);
  return { onChange, isLoading, onReset, dateCreate };
};
