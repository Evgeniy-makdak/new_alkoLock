import { useState } from 'react';

import { mapOptions } from '@shared/ui/search_multiple_select';

import { useTypeEventSelectApi } from '../api/useTypeEventSelectApi';

export const useTypeEventSelect = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { events, isLoading, isError } = useTypeEventSelectApi(searchQuery);

  const onChange = (value: string) => {
    setSearchQuery(value);
  };

  const onReset = () => {
    setSearchQuery('');
  };

  if (isError) {
    return { marksCarList: [], isLoading, onChange, onReset };
  }

  const marksCarList = mapOptions(events, (data) => [data.label, data.value]);

  return { marksCarList, isLoading, onChange, onReset };
};
