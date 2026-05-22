import { getQuery } from '@shared/api/baseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

export type BranchOfficeNode = {
  id?: number | string;
  name?: string;
  childOffices?: BranchOfficeNode[];
};

function unwrapBranchContent(res: {
  data?: { content?: BranchOfficeNode[] } | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): BranchOfficeNode[] {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'branch-offices request failed');
  }
  return res.data.content ?? [];
}

/** Все офисы из ответа API (корневые + childOffices), без дублей по id. */
export function flattenBranchOffices(nodes: BranchOfficeNode[]): BranchOfficeNode[] {
  const byId = new Map<string, BranchOfficeNode>();

  const visit = (node: BranchOfficeNode) => {
    if (node.id == null) return;
    const key = String(node.id);
    if (!byId.has(key)) {
      byId.set(key, { id: node.id, name: node.name });
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

function buildReportBranchOfficesListUrl(pageSize: number, searchQuery?: string): string {
  const match = Formatters.removeExtraSpaces(searchQuery ?? '');
  const searchQ = match ? `&all.match.contains=${encodeURIComponent(match)}` : '';
  return `api/branch-offices?page=0&size=${pageSize}${searchQ}&sort=name`;
}

export async function fetchBranchOfficesForReport(
  searchQuery?: string,
): Promise<BranchOfficeNode[]> {
  const url = buildReportBranchOfficesListUrl(REPORT_REFERENCE_LIST_PAGE_SIZE, searchQuery);
  const res = await getQuery<{ content: BranchOfficeNode[] }>({ url });
  return flattenBranchOffices(unwrapBranchContent(res));
}

/** Опции «Значение» для BranchOffice по выбранному полю metadata (name, id, …). */
export function branchOfficeValuesForAttribute(
  offices: BranchOfficeNode[],
  attribute: string,
  listPicker: boolean,
): Values {
  const attr = (attribute ?? '').trim();

  if (listPicker || attr === 'id') {
    return offices
      .filter((o) => o.id != null)
      .map((o) => ({
        value: o.id as number | string,
        label: (o.name ?? '').trim() || String(o.id),
      }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'));
  }

  const seen = new Map<string, Values[number]>();
  for (const office of offices) {
    const name = (office.name ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.set(name, { value: name, label: name });
  }
  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru'),
  );
}
