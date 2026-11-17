import { describe, expect, it, jest } from '@jest/globals';

import type { Values } from '@shared/ui/search_multiple_select';
import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';
import {
  buildComposeSortParams,
  buildReportSortFieldMap,
  encodeReportSortParamForQuery,
  parseComposeSortRowsFromSortParams,
} from './buildReportSortParam';

jest.mock('./reportEntityCompositeFields', () => ({
  expandCompositeFieldPath: (path: string): string[] => path.split('.'),
  isReportCompositeFieldPath: () => false,
  planReportCompositeResultColumns: () => ({
    displayColumnKeys: [] as string[],
    groups: [] as never[],
  }),
}));

jest.mock('./reportSelectedFieldAliases', () => ({
  encodeReportFieldAliasForApi: (value: string) => value.trim().replace(/\s+/g, '_'),
  extractReportTableFieldLabelLeaf: (label: string) =>
    label.includes('->') ? label.slice(label.lastIndexOf('->') + 2).trim() : label.trim(),
}));

describe('report sort aliases', () => {
  const columns: Values = [
    { value: 'timestamp#2', label: 'Отчёт о событиях -> Максимум' },
    { value: 'timestamp', label: 'Отчёт о событиях -> Минимум' },
  ];
  const selectedFields: ReportSelectedFieldPayload[] = [
    { fieldName: 'timestamp', alias: 'Максимум', aggregation: 'max' },
    { fieldName: 'timestamp', alias: 'Минимум', aggregation: 'min' },
  ];

  it('sorts a cloned aggregate by its alias even when clone is ahead of original', () => {
    expect(
      buildComposeSortParams(
        [{ columnKey: 'timestamp#2', direction: 'ASC' }],
        undefined,
        selectedFields,
        columns,
      ),
    ).toEqual(['Максимум,ASC']);
  });

  it('restores the exact aliased clone sort row when editing', () => {
    expect(parseComposeSortRowsFromSortParams(['Максимум,DESC'], columns, selectedFields)).toEqual([
      expect.objectContaining({ columnKey: 'timestamp#2', direction: 'DESC' }),
    ]);
  });

  it('uses aggregate aliases for result-grid sort while keeping ordinary field sorts unchanged', () => {
    const map = buildReportSortFieldMap([
      { fieldName: 'timestamp', alias: 'Максимум', aggregation: 'max' },
      { fieldName: 'name', alias: 'Имя' },
    ]);

    expect(map.get('Максимум')).toBe('Максимум');
    expect(map.get('Имя')).toBe('name');
    expect(map.get('timestamp')).toBe('timestamp');
  });

  it('URL-encodes non-ASCII sort aliases and preserves the direction separator', () => {
    expect(encodeReportSortParamForQuery('Максимум,ASC')).toBe(
      '%D0%9C%D0%B0%D0%BA%D1%81%D0%B8%D0%BC%D1%83%D0%BC,ASC',
    );
    expect(decodeURIComponent(encodeReportSortParamForQuery('Максимум,ASC'))).toBe('Максимум,ASC');
    expect(encodeReportSortParamForQuery('timestamp,DESC')).toBe('timestamp,DESC');
  });
});
