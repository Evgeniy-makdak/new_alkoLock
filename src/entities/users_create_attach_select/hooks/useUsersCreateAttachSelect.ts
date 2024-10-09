import { useMemo, useState, useEffect } from 'react';
import { AttachmentsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { IAttachmentItems } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useUsersCreateAttachSelect = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(20); 

  const onChange = (value: string) => {
    setSearchQuery(value);
  };

  const onReset = () => {
    setSearchQuery('');
  };

  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.ATTACHMENT_LIST],
    AttachmentsApi.getList,
    {
      options: {
        attachSearchQuery: searchQuery,
        limit: limit, 
      },
    },
  );

  useEffect(() => {
    if (data?.data.totalElements) {
      setLimit(data.data.totalElements); 
    }
  }, [data]);

  const array: number[] = [];

  // const userActionId = useMemo(() => {
  //   const filteredData = data?.data.content.filter(item => item.driver.isActive); // фильтрация по полю isActive
  //   return mapOptions<IAttachmentItems>(filteredData, (data) => adapterMapOptions(data, array));
  // }, [data]);  
  const userActionId = useMemo(
    () =>
      mapOptions<IAttachmentItems>(data?.data.content, (data) => adapterMapOptions(data, array)),
    [data],
  );

  return { isLoading, onReset, onChange, userActionId };
};
