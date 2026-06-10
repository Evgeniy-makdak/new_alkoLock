/** Служебный анонимный пользователь в отчётах — не показываем в UI. */
export type ReportAnonymousUserFields = {
  surname?: unknown;
  firstName?: unknown;
  middleName?: unknown;
  email?: unknown;
};

const REPORT_ANONYMOUS_USER_FIELD_PREFIXES = [
  'user',
  'createdBy',
  'userAction',
  'userRecord',
  'lastModifiedBy',
  'initiator',
  'handler',
] as const;

export function isReportAnonymousUser(
  user: ReportAnonymousUserFields | null | undefined,
): boolean {
  if (!user || typeof user !== 'object') return false;
  return (
    String(user.surname ?? '').trim() === '-' &&
    String(user.firstName ?? '').trim() === '' &&
    String(user.middleName ?? '').trim() === '' &&
    String(user.email ?? '').trim() === 'anonymous@localhost'
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readUserFieldsFromPrefix(
  row: Record<string, unknown>,
  prefix: string,
): ReportAnonymousUserFields | null {
  const nested = asRecord(row[prefix]);
  if (nested && ('email' in nested || 'surname' in nested)) {
    return nested;
  }

  const fields: ReportAnonymousUserFields = {
    surname: row[`${prefix}.surname`],
    firstName: row[`${prefix}.firstName`],
    middleName: row[`${prefix}.middleName`],
    email: row[`${prefix}.email`],
  };

  if (
    fields.surname === undefined &&
    fields.firstName === undefined &&
    fields.middleName === undefined &&
    fields.email === undefined
  ) {
    return null;
  }

  return fields;
}

/** Строка результата query отчёта связана с анонимным пользователем. */
export function isReportContentRowWithAnonymousUser(row: Record<string, unknown>): boolean {
  for (const prefix of REPORT_ANONYMOUS_USER_FIELD_PREFIXES) {
    const fields = readUserFieldsFromPrefix(row, prefix);
    if (fields && isReportAnonymousUser(fields)) {
      return true;
    }
  }
  return false;
}

export function filterReportContentRowsForUi<T extends Record<string, unknown>>(content: T[]): T[] {
  return content.filter((row) => !isReportContentRowWithAnonymousUser(row));
}

function collectAnonymousUserCandidates(record: Record<string, unknown>): ReportAnonymousUserFields[] {
  const candidates: ReportAnonymousUserFields[] = [];

  for (const key of ['userRecord', 'userAction', 'user', 'createdBy', 'lastModifiedBy'] as const) {
    const nested = asRecord(record[key]);
    if (nested) candidates.push(nested);
  }

  const events = record.events;
  if (Array.isArray(events)) {
    for (const event of events) {
      const ev = asRecord(event);
      const user = ev ? asRecord(ev.user) : null;
      if (user) candidates.push(user);
    }
  }

  return candidates;
}

/** DeviceAction / событие связано с анонимным пользователем. */
export function isReportRecordWithAnonymousUser(record: unknown): boolean {
  const row = asRecord(record);
  if (!row) return false;
  if (isReportContentRowWithAnonymousUser(row)) return true;
  return collectAnonymousUserCandidates(row).some(isReportAnonymousUser);
}

export function filterReportReferenceRecordsForUi(
  referenceEntity: string,
  records: unknown[],
): unknown[] {
  const ref = (referenceEntity ?? '').trim();
  if (ref === 'User' || ref === 'Driver') {
    return records.filter((record) => !isReportAnonymousUser(asRecord(record) as ReportAnonymousUserFields));
  }
  if (ref === 'DeviceAction' || ref === 'AutoServiceHistory') {
    return records.filter((record) => !isReportRecordWithAnonymousUser(record));
  }
  return records;
}
