import { useState } from 'react';

import { SortTypes, SortsTypes } from '@shared/config/queryParamsEnums';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useCarListQuery } from '../api/useCarListQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useCarsGosNumberSelect = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const onChange = (value: string) => {
    setSearchQuery(value);
  };
  const onReset = () => {
    setSearchQuery('');
  };

  const { carList, isLoading } = useCarListQuery({
    searchQuery,
    sortBy: SortTypes.GOS_NUMBER,
    order: SortsTypes.asc,
  });

  const carListMapped = mapOptions(carList, adapterMapOptions);
  return { onChange, onReset, isLoading, carList: carListMapped };
};
