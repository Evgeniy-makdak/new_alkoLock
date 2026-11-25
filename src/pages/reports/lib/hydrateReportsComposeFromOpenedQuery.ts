import { normalizeDuplicateColumnKeys } from './reportColumnDuplicate';
import { restoreReportComposeFiltersFromQuery } from './restoreReportComposeFiltersFromQuery';
import { restoreReportComposeTableFieldsFromQuery } from './restoreReportComposeTableFields';
import {
  buildRestoredTableFieldDateTimeFormatByPath,
  buildRestoredTableFieldDisplayParamByPath,
  encodeReportIdentifierDisplayParam,
} from './reportTableFieldDisplayParam';
import { isReportIdentifierFieldPath } from './reportTableFieldIdentifier';
import { reportGenerationStore } from '../model/reportGenerationStore';
import { reportsStore } from '../model/reportsStore';

import type { ReportQueryRequest } from '../types/reportApiTypes';

type HydrateArgs = {
  entityName: string;
  body: ReportQueryRequest;
  columnHeaderLabels?: Record<string, string>;
  /** pageable.sort — если уже лежит в queryContext / generation store. */
  sort?: string[];
};

/**
 * Гидратация reportsStore из уже открытого отчёта (queryContext / виджет дашборда).
 * Нужна, чтобы «Редактировать» после «Открыть полный отчёт» с дашборда
 * открывало compose с полями/фильтрами/группировкой, а не пустую форму create.
 */
export async function hydrateReportsComposeFromOpenedQuery(
  args: HydrateArgs,
): Promise<void> {
  const entityName = args.entityName.trim();
  if (!entityName || !args.body?.selectedFields?.length) return;

  const store = reportsStore.getState();
  if (store.selectedEntityName !== entityName) {
    store.setSelectedEntityName(entityName);
  }
  await reportsStore.getState().loadMetadataForEntity(entityName);
  const meta = reportsStore.getState().metadata;
  if (meta) {
    await reportsStore.getState().loadAllReferenceEntityMetadataForReport(meta);
  }

  const tableFields = normalizeDuplicateColumnKeys(
    restoreReportComposeTableFieldsFromQuery(
      args.body.selectedFields,
      args.columnHeaderLabels,
    ),
  );

  const hasFilters = (args.body.filters ?? []).some((f) => (f.fieldName ?? '').trim());
  let outputRows: ReturnType<typeof restoreReportComposeFiltersFromQuery> = [];
  if (hasFilters) {
    const previewRows = restoreReportComposeFiltersFromQuery(
      args.body.filters,
      meta,
      tableFields,
    );
    const tableMetaLoads: Promise<unknown>[] = [];
    for (const row of previewRows) {
      const key = row.selectedOutputFields[0]
        ? String(row.selectedOutputFields[0].value)
        : '';
      const field = meta?.fields.find((f) => f.fieldName === key);
      const ref = field?.referenceEntity?.trim();
      if (ref) {
        tableMetaLoads.push(reportsStore.getState().loadReportTableFieldsMetadata(row.id, ref));
      }
    }
    if (tableMetaLoads.length) {
      await Promise.all(tableMetaLoads);
    }
    const nestedByName = reportsStore.getState().referenceEntityMetadataByName;
    outputRows = restoreReportComposeFiltersFromQuery(args.body.filters, meta, tableFields, {
      referenceEntityMetadataByName: nestedByName,
    });
    // Если restore не собрал ни одной заполненной строки — не оставляем пустую
    // карточку: она блокирует «Сформировать» (incomplete selectedOutputFields).
    if (outputRows.every((row) => !row.selectedOutputFields.length)) {
      outputRows = [];
    }
  }
  // Без фильтров — [] как в обычном compose (не пустая незаполненная карточка).
  reportsStore.setState({
    outputRows,
    logicOperator: args.body.logicConnects?.[0]?.logicOperator === 'and' ? 'and' : 'or',
  });
  if (outputRows[0] && tableFields.length) {
    reportsStore.getState().setOutputRowReportTableFields(outputRows[0].id, tableFields);
  }

  // Агрегации / dateTimeFormat — zip к UI-ключам состава, не occurrence→path#N.
  const composeKeys = tableFields.map((field) => String(field.value));
  const restoredDisplay = buildRestoredTableFieldDisplayParamByPath(
    composeKeys,
    args.body.selectedFields,
  );
  const identifierCount = encodeReportIdentifierDisplayParam();
  for (const field of tableFields) {
    const key = String(field.value);
    if (isReportIdentifierFieldPath(key) && !restoredDisplay[key]) {
      restoredDisplay[key] = identifierCount;
    }
  }
  reportsStore.getState().setTableFieldDisplayParamByPath(restoredDisplay);
  reportsStore.getState().setTableFieldDateTimeFormatByPath(
    buildRestoredTableFieldDateTimeFormatByPath(composeKeys, args.body.selectedFields),
  );

  if (args.sort !== undefined) {
    reportGenerationStore.getState().setSort(args.sort.filter(Boolean));
  }
}
