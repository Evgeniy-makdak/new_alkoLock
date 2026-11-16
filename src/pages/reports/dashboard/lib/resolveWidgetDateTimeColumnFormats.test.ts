import { describe, expect, it, jest } from '@jest/globals';

import { formatReportTableDateTime } from '../../lib/formatReportTableDateTime';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportQueryRequest,
} from '../../types/reportApiTypes';
import { resolveWidgetDateTimeColumnFormatsFromMetadata } from './resolveWidgetColumnHeaderLabels';

jest.mock('../../api/reportsApi', () => ({}));
jest.mock('../../lib/deviceActionReportOptions', () => ({
  formatDeviceNameSerialLabel: () => '',
}));
jest.mock('../../lib/eventsForFrontReportOptions', () => ({
  isEventsForFrontTypeListAttribute: () => false,
  resolveEventsForFrontLevelFilterApiFieldName: (fieldName: string) => fieldName,
}));

function field(fieldName: string, type: string, referenceEntity?: string): ReportFieldDefinition {
  return {
    fieldName,
    label: fieldName,
    alias: null,
    type,
    referenceEntity,
    filterable: true,
    sortable: true,
    groupable: true,
    selectable: true,
    aggregation: null,
    availableOperations: [],
    availableFunctions: [],
  };
}

describe('dashboard widget date formatting metadata', () => {
  it('uses report precision for date fields and ignores year-only fields', () => {
    const rootMetadata: ReportEntityMetadata = {
      entityName: 'DashboardDateTest',
      label: 'Dashboard date test',
      fields: [
        field('vehicleBind', 'ENTITY', 'VehicleBind'),
        field('birthDate', 'DATE'),
        field('year', 'YEAR'),
      ],
    };
    const vehicleBindMetadata: ReportEntityMetadata = {
      entityName: 'VehicleBind',
      label: 'Vehicle bind',
      fields: [field('createdAt', 'INSTANT'), field('year', 'YEAR')],
    };
    const body: ReportQueryRequest = {
      selectedFields: [
        { fieldName: 'vehicleBind.createdAt', alias: 'installationDate' },
        { fieldName: 'birthDate' },
        { fieldName: 'year' },
        { fieldName: 'vehicleBind.year' },
      ],
      filters: [],
    };

    const formats = resolveWidgetDateTimeColumnFormatsFromMetadata(body, rootMetadata, {
      VehicleBind: vehicleBindMetadata,
    });

    expect(formats).toEqual({
      'vehicleBind.createdAt': 'second',
      installationDate: 'second',
      birthDate: 'day',
    });
    expect(formatReportTableDateTime('2026-07-01T07:32:39.114597', formats.installationDate)).toBe(
      '01.07.2026 07:32:39',
    );
    expect(formatReportTableDateTime('2026-07-01T00:00:00', formats.birthDate)).toBe('01.07.2026');
  });
});
