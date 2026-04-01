/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import { type Value, mapOptions } from '@shared/ui/search_multiple_select';

import { useCarListQuery } from '../api/useCarListQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useCarsSelect = (
  vieBranch = false,
  branchId?: ID,
  notInBranch?: ID,
  specified?: boolean,
  isActive?: boolean,
  includeIsActive?: boolean,
  isAttachment?: boolean,
  /** Варианты, которых нет в ответе API (напр. ТС уже привязано к этому алкозамку при редактировании). */
  alwaysIncludeOptions?: Value[],
) => {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
  };

  const onChange = (value: string) => {
    setInputValue(value);
  };

  const onReset = (value: string) => {
    setInputValue(value);
    setSearchQuery(value);
  };

  const { carList, isLoading } = useCarListQuery(
    {
      searchQuery,
      filterOptions: { branchId: branchId, notBranchId: notInBranch },
      specified,
      isActive,
      isAttachment,
    },
    includeIsActive,
  );

  const carListMapped = mapOptions(carList, (car) => {
    return adapterMapOptions(car as any, vieBranch);
  });

  const mergedList = (() => {
    const byVal = new Map<string, Value>();
    for (const opt of alwaysIncludeOptions ?? []) {
      byVal.set(String(opt.value), opt);
    }
    for (const item of carListMapped) {
      const k = String(item.value);
      if (!byVal.has(k)) byVal.set(k, item);
    }
    return Array.from(byVal.values());
  })();

  const q = inputValue.trim().toLowerCase();
  const filteredCarList = mergedList.filter((car) => {
    if (!q) return true;
    return car.label.toLowerCase().includes(q);
  });

  return { onChange, onReset, isLoading, carList: filteredCarList, inputValue, onInputChange };
};
