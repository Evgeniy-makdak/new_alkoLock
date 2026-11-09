import type { ReportFieldOperation } from '../types/reportApiTypes';

/** UI/POST: оператор «В диапазоне» (between) — всегда два значения (начало/конец). */
export function isReportDateTimeBetweenOperation(operationCode: string | null | undefined): boolean {
  return (operationCode ?? '').trim().toLowerCase() === 'between';
}

/**
 * between: по metadata.numberParameter === 2, иначе legacy по коду `between`.
 */
export function isReportBetweenFilterOperation(
  operationCode: string | null | undefined,
  numberParameter?: number | null,
): boolean {
  const arity = normalizeReportOperationNumberParameter(numberParameter);
  if (arity != null) return arity === 2;
  return isReportDateTimeBetweenOperation(operationCode);
}

/** Алиас сохранён для читаемости call-sites. */
export const isReportBetweenFilterOperationByCode = isReportDateTimeBetweenOperation;

/** Оба слота between заполнены (value[0] и value[1]). */
export function isReportBetweenFilterValuesComplete(
  values: { value?: unknown }[] | null | undefined,
): boolean {
  const start = values?.[0]?.value;
  const end = values?.[1]?.value;
  return start != null && start !== '' && end != null && end !== '';
}

/** Операторы без values в filters[] (metadata: isNull, isNotNull) — legacy без numberParameter. */
export function isReportFilterNullOperation(operationCode: string | null | undefined): boolean {
  const op = (operationCode ?? '').trim().toLowerCase();
  return op === 'isnull' || op === 'isnotnull';
}

/** Нормализация numberParameter из metadata (NaN → null). */
export function normalizeReportOperationNumberParameter(
  numberParameter: number | null | undefined,
): number | null {
  if (numberParameter == null || numberParameter === ('' as unknown)) return null;
  const n = Number(numberParameter);
  return Number.isFinite(n) ? n : null;
}

export function findReportFieldOperation(
  operations: ReportFieldOperation[] | null | undefined,
  operationCode: string | null | undefined,
): ReportFieldOperation | undefined {
  const code = (operationCode ?? '').trim();
  if (!code || !operations?.length) return undefined;
  return operations.find((op) => String(op.code) === code);
}

export function resolveReportOperationNumberParameter(
  operations: ReportFieldOperation[] | null | undefined,
  operationCode: string | null | undefined,
): number | null {
  return normalizeReportOperationNumberParameter(
    findReportFieldOperation(operations, operationCode)?.numberParameter,
  );
}

/**
 * Оператор без контрола значения:
 * numberParameter === 0 из metadata, иначе legacy isNull/isNotNull.
 */
export function isReportFilterValueOmittedOperation(
  operationCode: string | null | undefined,
  numberParameter?: number | null,
): boolean {
  const arity = normalizeReportOperationNumberParameter(numberParameter);
  if (arity != null) return arity === 0;
  return isReportFilterNullOperation(operationCode);
}

/** Операторы сравнения: одно значение (без мультивыбора). */
export function isReportSingleValueFilterOperation(
  operationCode: string | null | undefined,
  numberParameter?: number | null,
): boolean {
  const arity = normalizeReportOperationNumberParameter(numberParameter);
  if (arity != null) return arity === 1;
  const op = (operationCode ?? '').trim().toLowerCase();
  return (
    op === 'eq' ||
    op === 'ne' ||
    op === 'gt' ||
    op === 'gte' ||
    op === 'lt' ||
    op === 'lte' ||
    op === 'after' ||
    op === 'before'
  );
}

export type ReportFilterValueControlMode = {
  /** Из metadata; null — режим выведен по коду оператора. */
  numberParameter: number | null;
  showValueControl: boolean;
  isBetween: boolean;
  isSingle: boolean;
  /** Лимит для multi-select; undefined — без лимита. */
  maxValues: number | undefined;
};

/**
 * Режим контрола «Значение» по numberParameter (приоритет) или legacy-коду оператора.
 */
export function resolveReportFilterValueControlMode(params: {
  operationCode?: string | null;
  numberParameter?: number | null;
  defaultMultiple?: boolean;
  isBooleanValueField?: boolean;
}): ReportFilterValueControlMode {
  const {
    operationCode = null,
    numberParameter,
    defaultMultiple = true,
    isBooleanValueField = false,
  } = params;

  if (isBooleanValueField) {
    return {
      numberParameter: normalizeReportOperationNumberParameter(numberParameter),
      showValueControl: true,
      isBetween: false,
      isSingle: true,
      maxValues: undefined,
    };
  }

  const arity = normalizeReportOperationNumberParameter(numberParameter);
  if (arity != null) {
    if (arity === 0) {
      return {
        numberParameter: 0,
        showValueControl: false,
        isBetween: false,
        isSingle: true,
        maxValues: undefined,
      };
    }
    if (arity === 1) {
      return {
        numberParameter: 1,
        showValueControl: true,
        isBetween: false,
        isSingle: true,
        maxValues: 1,
      };
    }
    if (arity === 2) {
      return {
        numberParameter: 2,
        showValueControl: true,
        isBetween: true,
        isSingle: false,
        maxValues: 2,
      };
    }
    if (arity === -1) {
      return {
        numberParameter: -1,
        showValueControl: true,
        isBetween: false,
        isSingle: false,
        maxValues: undefined,
      };
    }
    if (arity > 2) {
      return {
        numberParameter: arity,
        showValueControl: true,
        isBetween: false,
        isSingle: false,
        maxValues: arity,
      };
    }
  }

  if (isReportFilterNullOperation(operationCode)) {
    return {
      numberParameter: null,
      showValueControl: false,
      isBetween: false,
      isSingle: true,
      maxValues: undefined,
    };
  }
  if (isReportDateTimeBetweenOperation(operationCode)) {
    return {
      numberParameter: null,
      showValueControl: true,
      isBetween: true,
      isSingle: false,
      maxValues: 2,
    };
  }
  if (isReportSingleValueFilterOperation(operationCode)) {
    return {
      numberParameter: null,
      showValueControl: true,
      isBetween: false,
      isSingle: true,
      maxValues: 1,
    };
  }
  if ((operationCode ?? '').trim()) {
    return {
      numberParameter: null,
      showValueControl: true,
      isBetween: false,
      isSingle: false,
      maxValues: undefined,
    };
  }
  if (!defaultMultiple) {
    return {
      numberParameter: null,
      showValueControl: true,
      isBetween: false,
      isSingle: true,
      maxValues: 1,
    };
  }
  return {
    numberParameter: null,
    showValueControl: true,
    isBetween: false,
    isSingle: false,
    maxValues: undefined,
  };
}

/** Лимит значений в «Значение»: через numberParameter или legacy по коду. */
export function resolveReportFilterValueMaxValues(
  filterOperationCode: string | null | undefined,
  defaultMultiple: boolean,
  isBooleanValueField = false,
  numberParameter?: number | null,
): number | undefined {
  return resolveReportFilterValueControlMode({
    operationCode: filterOperationCode,
    numberParameter,
    defaultMultiple,
    isBooleanValueField,
  }).maxValues;
}
