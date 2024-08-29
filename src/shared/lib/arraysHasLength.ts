import type { Values } from '@shared/ui/search_multiple_select';

export const arraysHasLength = (arrays: Values[]) => {
  let hasLength = false;
  arrays.map((array) => {
    if (array.length > 0) {
      hasLength = true;
    }
  });
  return hasLength;
};
