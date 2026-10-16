import { describe, expect, it } from '@jest/globals';

import { restoreReportComposeFiltersFromQuery } from './restoreReportComposeFiltersFromQuery';

import type { ReportEntityMetadata } from '../types/reportApiTypes';

const monitoringDeviceMeta: ReportEntityMetadata = {
  entityName: 'MonitoringDevice',
  label: 'Отчет по алкозамкам',
  fields: [
    {
      fieldName: 'id',
      label: 'Идентификатор',
      alias: null,
      type: 'LONG',
      filterable: true,
      sortable: true,
      groupable: true,
      aggregation: null,
      availableOperations: [
        { code: 'in', label: 'in' },
        { code: 'equals', label: 'equals' },
      ],
      availableFunctions: [],
    },
    {
      fieldName: 'name',
      label: 'Имя',
      alias: null,
      type: 'STRING',
      filterable: true,
      sortable: true,
      groupable: true,
      aggregation: null,
      availableOperations: [{ code: 'equals', label: 'equals' }],
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
      groupable: false,
      aggregation: null,
      availableOperations: [],
      availableFunctions: [],
    },
  ],
};

describe('restoreReportComposeFiltersFromQuery', () => {
  it('maps root id + nested eventsForFront.label into UI filter rows', () => {
    const rows = restoreReportComposeFiltersFromQuery(
      [
        { fieldName: 'id', operator: 'in', values: [291928] },
        {
          fieldName: 'eventsForFront.label',
          operator: 'in',
          values: ['Блокировка двигателя'],
        },
      ],
      monitoringDeviceMeta,
      [{ value: 'id', label: 'id' }],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('primary');
    expect(String(rows[0].selectedOutputFields[0]?.value)).toBe('id');
    expect(rows[0].filterSelections.id?.map((v) => v.value)).toEqual([291928]);
    expect(
      rows[0].filterSelections[`__report_output_operation__${rows[0].id}`]?.[0]?.value,
    ).toBe('in');

    expect(String(rows[1].selectedOutputFields[0]?.value)).toBe('eventsForFront.label');
    expect(rows[1].nestedEntityFilterByField.eventsForFront?.path).toEqual(['label']);
    expect(rows[1].nestedEntityFilterByField.eventsForFront?.values.map((v) => v.value)).toEqual([
      'Блокировка двигателя',
    ]);
  });

  it('returns empty primary row when filters are empty', () => {
    const rows = restoreReportComposeFiltersFromQuery([], monitoringDeviceMeta, [
      { value: 'name', label: 'name' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].selectedOutputFields).toEqual([]);
    expect(rows[0].reportTableFields).toEqual([{ value: 'name', label: 'name' }]);
  });
});
