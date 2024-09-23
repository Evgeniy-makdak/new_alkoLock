import { useState } from 'react';

import { mapOptions } from '@shared/ui/search_multiple_select';

import { useMarksCarQuery } from '../api/useMarksCarQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

interface MarksCarResponse {
  content: string[];
  pageable: any;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

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
    isLoading ? [] : (data?.data as unknown as MarksCarResponse)?.content,
    adapterMapOptions,
  );

  return { onChange, isLoading, onReset, marksCarList };
};
