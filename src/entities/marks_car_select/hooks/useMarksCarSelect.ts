import { useState } from 'react';

import { mapOptions } from '@shared/ui/search_multiple_select';

import { useMarksCarQuery } from '../api/useMarksCarQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useMarksCarSelect = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const onChange = (value: string) => {
    setSearchQuery(value);
  };

  const { data, isLoading } = useMarksCarQuery({ searchQuery });

  const onReset = () => {
    setSearchQuery('');
  };

  const marksCarList = mapOptions(
    isLoading ? [] : Array.isArray(data?.data) ? data?.data : data?.data.content || [],
    adapterMapOptions,
  );

  return { onChange, isLoading, onReset, marksCarList };
};
