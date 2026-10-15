import { describe, expect, it } from '@jest/globals';

import { buildLocalReportAiComposeDraft } from './reportAiLocalFallback';
import { buildReportAiPromptContext } from './reportAiPromptContext';

import type { ReportEntityMetadata } from '../types/reportApiTypes';

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
        availableOperations: [{ code: 'eq', label: '=' }],
        availableFunctions: [{ code: 'count', label: 'Количество' }],
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
        fieldName: 'longitude',
        label: 'Долгота',
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
        fieldName: 'vehicle',
        label: 'ТС',
        alias: null,
        type: 'ENTITY',
        referenceEntity: 'Vehicle',
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

function buildContext() {
  return buildReportAiPromptContext({
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
      },
      MonitoringDevice: {
        ...stubDeviceEventMetadata(),
        entityName: 'MonitoringDevice',
        label: 'Отчёт по алкозамкам',
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
}

describe('buildLocalReportAiComposeDraft', () => {
  it('разбирает пример «Жигули и Москвич»: count + branch + eventType + vehicleMake + current_month', () => {
    const context = buildContext();
    const draft = buildLocalReportAiComposeDraft(
      'Создай отчёт по основному филиалу, в котором будет показано количество неразрешённых движений для автомобилей Жигули, а также Москвич за текущий месяц',
      context,
    );

    expect(draft.entityName).toBe('DeviceEvent');
    expect(draft.viewMode).toBe('table');

    // count-агрегация
    const countField = draft.selectedFields.find((f) => f.aggregation === 'count');
    expect(countField).toBeTruthy();

    // branch resolve
    expect(draft.resolveHints?.some((h) => h.kind === 'branch')).toBe(true);

    // eventType resolve (неразрешённое движение)
    const eventHint = draft.resolveHints?.find((h) => h.kind === 'eventType');
    expect(eventHint?.query).toContain('неразрешённое движение');

    // vehicleMake resolve (несколько марок)
    const makeHint = draft.resolveHints?.find((h) => h.kind === 'vehicleMake');
    expect(makeHint?.fieldName).toBe('vehicle.manufacturer');
    expect(makeHint?.query).toContain('жигули');
    expect(makeHint?.query).toContain('москвич');

    // current_month
    expect(draft.relativeDateRanges?.[0]?.range).toBe('current_month');
  });

  it('не путает «Жигули» с сущностью Vehicle — остаётся DeviceEvent', () => {
    const context = buildContext();
    const draft = buildLocalReportAiComposeDraft(
      'количество неразрешённых движений для Жигули за текущий месяц',
      context,
    );
    expect(draft.entityName).toBe('DeviceEvent');
  });
});
