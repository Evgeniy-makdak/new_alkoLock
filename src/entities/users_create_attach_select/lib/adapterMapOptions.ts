import type { IAttachmentItems, ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (item: IAttachmentItems, arr: ID[]): [string, ID] | [] => {
  if (arr.find((val) => val === item.createdBy.id)) return [];
  arr.push(item.createdBy.id);
  return [
    `${item.createdBy.surname} ${item.createdBy.firstName} ${item.createdBy.middleName} ${item.createdBy.email}`,
    item.createdBy.id,
  ];
};
