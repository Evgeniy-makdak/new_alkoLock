import { useRef, useState } from 'react';

import { StorageKeys } from '@shared/const/storageKeys';
import { getItem, removeItem, setItem } from '@shared/model/store/localStorage';

/**
 * @field key => константные ключи объявленные в {@link StorageKeys }
 * @field value? => значение которое сохраниться в стор. Если в сторе нет значения под ключом key, то сразу сохраниться переданное значение.
 * Если значение уже есть под ключом key, то переданное значение будет проигнорировано и вернется сохраненное значение.
 */
type UseLocalStorageArgs<T> = {
  key: StorageKeys;
  value?: T | null;
};

export function useLocalStorage<T>({ key, value = null }: UseLocalStorageArgs<T>) {
  const [state, setState] = useState<T | null | undefined>(() => {
    const data = getItem<T>(key);
    if (!data) {
      return value;
    }
    return data;
  });
  const keyRef = useRef(key);

  function getState(key: string) {
    const data = getItem<T>(key);
    if (!data) {
      setItemState(value);
      return;
    }
    setState(data);
  }

  function setItemState(newValue: T) {
    setItem(keyRef.current, newValue);
    setState(newValue);
  }

  function clearState(key: string) {
    removeItem(key);
    setState(null);
  }

  return { state, getState, setItemState, clearState };
}
