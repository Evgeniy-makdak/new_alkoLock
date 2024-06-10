import type { IAttachmentItems, ID } from '@shared/types/BaseQueryTypes';

export const adapterMapOptions = (item: IAttachmentItems, arr: ID[]): [string, ID] | [] => {
  if (arr.find((val) => val === item.userActionId.id)) return [];
  arr.push(item.userActionId.id);
  return [
    `${item.userActionId.surName} ${item.userActionId.firstName} ${item.userActionId.lastName} ${item.userActionId.email}`,
    item.userActionId.id,
  ];
};
