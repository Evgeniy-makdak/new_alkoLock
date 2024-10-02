import { useEffect, useState } from 'react';
import type { ID } from '@shared/types/BaseQueryTypes';
import { SearchMultipleSelect, type Value, type Values } from '@shared/ui/search_multiple_select';
import { useCarsSelect } from '../hooks/useCarsSelect';

interface CarsSelectProps<T> {
  testid?: string;
  multiple?: boolean;
  label?: string;
  error?: boolean;
  setValueStore?: (type: keyof T, value: string | Value | (string | Value)[]) => void;
  name: keyof T;
  value: Values;
  branchId?: ID;
  notInBranch?: ID;
  vieBranch?: boolean;
  specified?: boolean;
  reset?: () => void;
  isOpen?: boolean;
}

export function CarsSelect<T>({
  specified,
  vieBranch = false,
  branchId,
  notInBranch,
  reset,
  isOpen,
  ...rest
}: CarsSelectProps<T>) {
  const { value } = rest;
  const { onReset, isLoading, carList } = useCarsSelect(vieBranch, branchId, notInBranch, specified);

  const [inputValue, setInputValue] = useState<string>('');
  const [filteredCars, setFilteredCars] = useState<Values>(carList);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setFilteredCars(carList);
    }
  }, [isOpen, carList]);

  useEffect(() => {
    if (inputValue) {
      const filtered = carList.filter(car =>
        car.label.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredCars(filtered);
    } else {
      setFilteredCars(carList);
    }
  }, [inputValue, carList]);

  useEffect(() => {
    if (reset) {
      reset();
    }
  }, [carList]);

  if (!value) return ' ';

  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={setInputValue}
      isLoading={isLoading}
      values={filteredCars}
      {...rest}
    />
  );
}
