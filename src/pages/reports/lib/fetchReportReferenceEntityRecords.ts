import { EventsApi, UsersApi } from '@shared/api/baseQuerys';
import { getBranchListUrl, getSelectBranchQueryUrl } from '@shared/lib/getUrlForQueries';
import { getQuery } from '@shared/api/baseQueryTypes';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAlcolock, IBranch, IDeviceAction, IUser } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';

import { isReportReferenceEntityServerSearch } from './reportReferenceEntityServerSearch';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

function unwrapContent<T>(res: {
  data?: { content?: T[]; totalPages?: number } | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): { content: T[] } {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report reference list failed');
  }
  return {
    content: res.data.content ?? [],
  };
}

/** Сырые записи вложенной сущности (только для сущностей без серверного поиска в выпадающих списках). */
export async function fetchReportReferenceEntityRecords(referenceEntity: string): Promise<unknown[]> {
  const ref = (referenceEntity ?? '').trim();
  if (!ref || isReportReferenceEntityServerSearch(ref)) {
    return [];
  }

  const branchId = appStore.getState().selectedBranchState?.id;
  const pageSize = REPORT_REFERENCE_LIST_PAGE_SIZE;

  switch (ref) {
    case 'BranchOffice': {
      const base: QueryOptions = {
        page: 0,
        limit: pageSize,
        filterOptions: branchId != null ? { branchId } : {},
      };
      const url = getBranchListUrl(base);
      const res = await getQuery<{ content: IBranch[] }>({ url });
      return unwrapContent<IBranch>(res).content;
    }
    case 'DeviceAction': {
      const branchQ =
        branchId != null
          ? getSelectBranchQueryUrl({
              branchId,
              page: 'device',
              useAssignmentPrefix: true,
              parameters: '',
            })
          : '';
      const url = `api/device-actions?page=0&size=${pageSize}${branchQ}&sort=timestamp,DESC`;
      const res = await getQuery<{ content: IDeviceAction[] }>({ url });
      return unwrapContent<IDeviceAction>(res).content;
    }
    default:
      return [];
  }
}
