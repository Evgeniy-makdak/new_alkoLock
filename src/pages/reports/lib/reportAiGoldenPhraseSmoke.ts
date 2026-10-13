import { buildLocalReportAiComposeDraft } from './reportAiLocalFallback';
import {
  REPORT_AI_GOLDEN_PHRASES,
  matchGoldenPhraseExpectations,
} from './reportAiGoldenPhrases';
import { buildReportAiPromptContext } from './reportAiPromptContext';

import type { ReportEntityMetadata } from '../types/reportApiTypes';

/** Минимальная metadata для smoke без сети. */
function stubDeviceEventMetadata(): ReportEntityMetadata {
  return {
    entityName: 'DeviceEvent',
    label: 'Отчёт по событиям',
    fields: [
      {
        fieldName: 'id',
        label: 'Идентификатор',
        alias: null,
        type: 'LONG',
        filterable: true,
        sortable: true,
        groupable: true,
        selectable: true,
        aggregation: null,
        availableOperations: [{ code: 'equals', label: '=' }],
        availableFunctions: [],
      },
      {
        fieldName: 'timestamp',
        label: 'Время',
        alias: null,
        type: 'DATETIME',
        filterable: true,
        sortable: true,
        groupable: true,
        selectable: true,
        aggregation: null,
        availableOperations: [{ code: 'between', label: 'between' }],
        availableFunctions: [],
      },
      {
        fieldName: 'latitude',
        label: 'Широта',
        alias: null,
        type: 'DOUBLE',
        filterable: true,
        sortable: true,
        groupable: false,
        selectable: true,
        aggregation: null,
        availableOperations: [],
        availableFunctions: [],
      },
      {
        fieldName: 'user',
        label: 'Пользователь',
        alias: null,
        type: 'ENTITY',
        referenceEntity: 'User',
        filterable: true,
        sortable: false,
        groupable: true,
        selectable: false,
        aggregation: null,
        availableOperations: [],
        availableFunctions: [],
      },
      {
        fieldName: 'branch',
        label: 'Офис',
        alias: null,
        type: 'ENTITY',
        referenceEntity: 'BranchOffice',
        filterable: true,
        sortable: false,
        groupable: true,
        selectable: false,
        aggregation: null,
        availableOperations: [],
        availableFunctions: [],
      },
      {
        fieldName: 'eventsForFront',
        label: 'Тип события',
        alias: null,
        type: 'ENTITY',
        referenceEntity: 'EventsForFront',
        filterable: true,
        sortable: false,
        groupable: true,
        selectable: false,
        aggregation: null,
        availableOperations: [],
        availableFunctions: [],
      },
      {
        fieldName: 'device',
        label: 'Алкозамок',
        alias: null,
        type: 'ENTITY',
        referenceEntity: 'MonitoringDevice',
        filterable: true,
        sortable: false,
        groupable: true,
        selectable: false,
        aggregation: null,
        availableOperations: [],
        availableFunctions: [],
      },
    ],
  };
}

/**
 * Локальный smoke эталонных фраз (без Gemini).
 * Возвращает список проблем; пустой массив = ок для ожиданий entity/viewMode.
 */
export function runReportAiGoldenPhraseSmoke(): Array<{ id: string; issues: string[] }> {
  const context = buildReportAiPromptContext({
    entities: [
      { entityName: 'DeviceEvent', label: 'Отчёт по событиям' },
      { entityName: 'User', label: 'Отчёт по пользователям' },
      { entityName: 'MonitoringDevice', label: 'Отчёт по алкозамкам' },
      { entityName: 'Vehicle', label: 'Отчёт по ТС' },
      { entityName: 'AutoServiceHistory', label: 'Отчёт по истории автосервиса' },
    ],
    metadataByEntity: {
      DeviceEvent: stubDeviceEventMetadata(),
      User: {
        ...stubDeviceEventMetadata(),
        entityName: 'User',
        label: 'Отчёт по пользователям',
        fields: stubDeviceEventMetadata().fields.filter((f) =>
          ['id', 'timestamp'].includes(f.fieldName),
        ),
      },
      MonitoringDevice: {
        ...stubDeviceEventMetadata(),
        entityName: 'MonitoringDevice',
        label: 'Отчёт по алкозамкам',
        fields: [
          {
            fieldName: 'id',
            label: 'ID',
            alias: null,
            type: 'LONG',
            filterable: true,
            sortable: true,
            groupable: true,
            selectable: true,
            aggregation: null,
            availableOperations: [],
            availableFunctions: [],
          },
          {
            fieldName: 'serialNumber',
            label: 'Серийный номер',
            alias: null,
            type: 'STRING',
            filterable: true,
            sortable: true,
            groupable: true,
            selectable: true,
            aggregation: null,
            availableOperations: [],
            availableFunctions: [],
          },
        ],
      },
      Vehicle: {
        ...stubDeviceEventMetadata(),
        entityName: 'Vehicle',
        label: 'Отчёт по ТС',
      },
      AutoServiceHistory: {
        ...stubDeviceEventMetadata(),
        entityName: 'AutoServiceHistory',
        label: 'Отчёт по истории автосервиса',
      },
    },
  });

  return REPORT_AI_GOLDEN_PHRASES.map((phrase) => {
    const draft = buildLocalReportAiComposeDraft(phrase.text, context);
    return {
      id: phrase.id,
      issues: matchGoldenPhraseExpectations(phrase, draft),
    };
  });
}
