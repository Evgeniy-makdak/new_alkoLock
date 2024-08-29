import { isEqual } from 'lodash';

import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';

export default class ArrayUtils {
  static includes<T>(array: T[], value: T) {
    const index = array.findIndex((elem) => isEqual(elem, value));
    return index >= 0;
  }

  /**
   *
   * @param values => может быть либо строкой, типом {@link Value}, либо массивом (Value | string)[]
   * @returns ID => вернет все id готовые для вставки в query параметры например: '1,2,3,45,6'
   */
  static getIDFromArrayValues(values: (string | Value)[] | Value): ID {
    if (Array.isArray(values)) {
      const arr: ID[] = [];
      values.map((item) => {
        if (typeof item === 'string') return;
        arr.push(item.value);
      });
      return arr.join(',').trim();
    }
    return values.value;
  }

  static getArrayValues(values: (string | Value)[] | Value | string): Values {
    const arr: Values = [];
    if (typeof values === 'string' || !values) return arr;
    if (Array.isArray(values)) {
      values.map((val) => {
        if (typeof val === 'string') return;
        arr.push(val);
      });
      return arr;
    }
    return [values];
  }

  static getArrayFromValues(values: (string | Value)[] | Value): ID[] {
    if (Array.isArray(values)) {
      const arr: ID[] = [];
      values.map((item) => {
        if (typeof item === 'string') return;
        arr.push(item.value);
      });
      return arr;
    }
    return [values.value];
  }
  static getValueFromAnyOption(
    value: string | Value | (string | Value)[] | undefined | null,
  ): Value {
    if (Array.isArray(value)) {
      return typeof value[0] === 'object' ? value[0] : null;
    } else if (typeof value === 'object') {
      return value;
    }
  }
}
