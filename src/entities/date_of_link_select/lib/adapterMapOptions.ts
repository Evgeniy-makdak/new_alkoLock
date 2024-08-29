import type { IAttachmentItems, ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const adapterMapOptions = (item: IAttachmentItems): [string, ID] => {
  return [`${Formatters.formatISODate(item.createdAt)}`, item.id];
};
