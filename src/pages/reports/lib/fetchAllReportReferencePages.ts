type PaginatedListPayload<T> = { content?: T[]; totalElements?: number } | T[] | null | undefined;

export type ReportReferencePageResult<T> = {
  data?: PaginatedListPayload<T>;
  isError?: boolean;
  message?: string;
  detail?: string;
};

function extractPageContent<T>(data: PaginatedListPayload<T>): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

function extractTotalElements<T>(data: PaginatedListPayload<T>, contentLength: number): number {
  if (data == null) return contentLength;
  if (Array.isArray(data)) return contentLength;
  return Number(data.totalElements ?? contentLength);
}

/** Все страницы справочника для выпадающих списков отчётов (пока content.length < pageSize или all.length >= total). */
export async function fetchAllReportReferencePages<T>(
  fetchPage: (page: number) => Promise<ReportReferencePageResult<T>>,
  pageSize: number,
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  let total = Infinity;

  for (;;) {
    const res = await fetchPage(page);
    if (res.isError || res.data == null) {
      throw new Error(res.message || res.detail || 'report reference list request failed');
    }

    const content = extractPageContent(res.data);
    total = extractTotalElements(res.data, content.length);
    all.push(...content);

    if (content.length === 0 || content.length < pageSize || all.length >= total) break;
    page += 1;
  }

  return all;
}
