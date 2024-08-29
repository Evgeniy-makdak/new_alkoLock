import { useState } from 'react';

/**
 *
 * @param initState - начальное состояние true или false (по умолчанию false)
 * @returns [
 * * state => текущее состояние
 * * toggle => функция меняющее состояние на противоположное от текущего
 * * reset => функция для сброса в исходное состояние (в false)
 * * set => функция для установки состояния
 *
 * ]
 */
export const useToggle = (
  initState = false,
): [boolean, () => void, () => void, (state: boolean) => void] => {
  const [state, setState] = useState(initState);
  const toggle = () => setState(!state);
  const set = (payload: boolean) => setState(payload);
  const reset = () => setState(false);

  return [state, toggle, reset, set];
};
