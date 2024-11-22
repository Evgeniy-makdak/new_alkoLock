import type { AutocompleteChangeDetails, AutocompleteChangeReason } from '@mui/material';

import type { Permissions } from '@shared/config/permissionsEnums';
import type { ID } from '@shared/types/BaseQueryTypes';

/**
 * @field label - текст для отображения
 * @field value - значение элемента (обычно ID)
 * @field permissions? - доступы для элемента - нужно для удобного доступа разрешениям ??? - может быть не нужно и потом удалить
 */
export type Value = {
  label: string;
  value: ID;
  permissions?: Permissions[] | [] | null | undefined;
};

/**
 * [
 * {
 * @field label - текст для отображения
 * @field value - значение элемента (обычно ID)
 * @field permissions? - доступы для элемента - нужно для удобного доступа разрешениям ??? - может быть не нужно и потом удалить
 *
 * }
 * ]
 */
export type Values = Value[];

export const isOptionEqualToValue = (option: Value | Values, value: Value | Values) => {
  if (!Array.isArray(option) && !Array.isArray(value)) return option.value === value.value;
  if (!Array.isArray(option) && Array.isArray(value)) return option.value === value[0]?.value;
};
export type AdapterReturn = [string, ID] | [string, ID, Permissions[] | [] | undefined | null] | [];

export const renderOptions = (
  props: React.HTMLAttributes<HTMLLIElement>,
  option: Value,
  testid: string,
) => {
  return (
    <li {...props} key={option.value?.toString()} data-testid={`${testid}_${option.label}`}>
      {option.label}
    </li>
  );
};

export type OnChange = (
  event: React.SyntheticEvent<Element, Event>,
  value: string | Value | Values | (string | Value | Values)[],
  reason: AutocompleteChangeReason,
  details?: AutocompleteChangeDetails,
) => void;

export function mapOptions<T>(values: T[], adapter: (data: T) => AdapterReturn): Values {
  if (!Array.isArray(values)) return [];
  const readyArr: Values = [];
  values.map((data) => {
    const vals = adapter(data);
    if (!vals.length) return;
    const [label, value, permissions] = vals;
    readyArr.push({
      label,
      value,
      permissions,
    });
  });

  return readyArr;
}
