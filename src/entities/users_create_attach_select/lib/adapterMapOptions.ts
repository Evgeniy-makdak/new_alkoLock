import type { IAttachmentItems, ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (item: IAttachmentItems, arr: ID[]): [string, ID] | [] => {
  if (arr.find((val) => val === item.createdBy.id)) return [];
  arr.push(item.createdBy.id);
  return [
    `${item.createdBy.middleName} ${item.createdBy.firstName} ${item.createdBy.lastName} ${item.createdBy.email}`,
    item.createdBy.id,
  ];
};
