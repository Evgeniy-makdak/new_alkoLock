import { useState } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useCarListQuery } from '../api/useCarListQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useCarsSelect = (
  vieBranch = false,
  branchId?: ID,
  notInBranch?: ID,
  specified?: boolean,
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setSearchQuery(value);
  };

  const onChange = (value: string) => {
    setInputValue(value);
  };

  const onReset = (value: string) => {
    setInputValue(value);
    setSearchQuery(value);
  };

  const { carList, isLoading } = useCarListQuery({
    searchQuery,
    filterOptions: { branchId: branchId, notBranchId: notInBranch },
    specified,
  });

  const carListMapped = mapOptions(carList, (car) => {
    return adapterMapOptions(car, vieBranch);
  });

  const filteredCarList = carListMapped.filter((car) =>
    car.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return { onChange, onReset, isLoading, carList: filteredCarList, inputValue, onInputChange };
};
