import { describe, expect, it } from '@jest/globals';

import type { ReportFieldDefinition } from '../types/reportApiTypes';
import { isReportFreeTextField } from './reportFieldFilterKind';

function field(type: string): ReportFieldDefinition {
  return {
    fieldName: 'value',
    label: 'Значение',
    alias: null,
    type,
    filterable: true,
    sortable: true,
    groupable: true,
    selectable: true,
    aggregation: null,
    availableOperations: [],
    availableFunctions: [],
  };
}

describe('isReportFreeTextField', () => {
  it.each(['TEXT', 'STRING', 'VARCHAR', 'VARCHAR(255)', 'NVARCHAR(255)', 'CLOB'])(
    'allows free text for %s fields',
    (type) => {
      expect(isReportFreeTextField(field(type))).toBe(true);
    },
  );

  it.each(['ENUM', 'BOOLEAN', 'INTEGER'])('does not allow free text for %s fields', (type) => {
    expect(isReportFreeTextField(field(type))).toBe(false);
  });
});
