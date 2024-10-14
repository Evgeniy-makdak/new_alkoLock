import type { IAttachmentItems, ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (item: IAttachmentItems, arr: ID[]): [string, ID] | [] => {
  if (!item.id) return [];
  if (arr.find((val) => val === item?.id)) return [];

  arr.push(item?.id);

  return [
    `${item.surname || ''} ${item.firstName || ''} ${item.middleName || ''} ${item.email || ''}`,
    item?.id,
  ];
};
