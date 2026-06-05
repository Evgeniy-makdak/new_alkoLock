import { getQuery } from '@shared/api/baseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { fetchAllReportReferencePages } from './fetchAllReportReferencePages';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

export type BranchOfficeNode = {
  id?: number | string;
  name?: string;
  parentOffice?: { id?: number | string; name?: string } | null;
  childOffices?: BranchOfficeNode[];
  createdAt?: string;
  lastModifiedAt?: string;
  createdBy?: { id?: number | string; fullName?: string; surname?: string; firstName?: string };
  lastModifiedBy?: { id?: number | string; fullName?: string; surname?: string; firstName?: string };
  systemGenerated?: boolean;
};

/** Все офисы из ответа API (корневые + childOffices), без дублей по id. */
export function flattenBranchOffices(nodes: BranchOfficeNode[]): BranchOfficeNode[] {
  const byId = new Map<string, BranchOfficeNode>();

  const visit = (node: BranchOfficeNode) => {
    if (node.id == null) return;
    const key = String(node.id);
    if (!byId.has(key)) {
      byId.set(key, node);
    }
    const children = node.childOffices;
    if (!Array.isArray(children)) return;
    for (const child of children) {
      if (child && typeof child === 'object') {
        visit(child);
      }
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return Array.from(byId.values());
}

function buildReportBranchOfficesListUrl(
  pageSize: number,
  searchQuery?: string,
  page = 0,
): string {
  const match = Formatters.removeExtraSpaces(searchQuery ?? '');
  const searchQ = match ? `&all.match.contains=${encodeURIComponent(match)}` : '';
  return `api/branch-offices?page=${page}&size=${pageSize}${searchQ}&sort=name`;
}

export async function fetchBranchOfficesForReport(
  searchQuery?: string,
): Promise<BranchOfficeNode[]> {
  const pageSize = REPORT_REFERENCE_LIST_PAGE_SIZE;
  const roots = await fetchAllReportReferencePages<BranchOfficeNode>(
    (page) =>
      getQuery<{ content: BranchOfficeNode[]; totalElements?: number }>({
        url: buildReportBranchOfficesListUrl(pageSize, searchQuery, page),
      }),
    pageSize,
  );
  return flattenBranchOffices(roots);
}

