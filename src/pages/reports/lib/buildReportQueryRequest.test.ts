import { describe, expect, it, jest } from '@jest/globals';

import type { ReportEntityMetadata, ReportFieldDefinition } from '../types/reportApiTypes';
import { buildReportQueryRequest } from './buildReportQueryRequest';

jest.mock('./deviceActionReportOptions', () => ({
  formatDeviceNameSerialLabel: () => '',
}));
jest.mock('./eventsForFrontReportOptions', () => ({
  isEventsForFrontTypeListAttribute: () => false,
  resolveEventsForFrontLevelFilterApiFieldName: (fieldName: string) => fieldName,
}));

function field(fieldName: string, label: string): ReportFieldDefinition {
  return {
    fieldName,
    label,
    alias: null,
    type: 'STRING',
    filterable: true,
    sortable: true,
    groupable: true,
    selectable: true,
    aggregation: null,
    availableOperations: [],
    availableFunctions: [],
  };
}

describe('buildReportQueryRequest', () => {
  it.each([
    {
      tableFields: [
        { value: '__composite.User', label: 'Отчет по пользователям -> ФИО' },
        { value: 'surname', label: 'Отчет по пользователям -> Фамилия' },
      ],
    },
    {
      tableFields: [
        { value: 'surname', label: 'Отчет по пользователям -> Фамилия' },
        { value: '__composite.User', label: 'Отчет по пользователям -> ФИО' },
      ],
    },
  ])('keeps an explicitly selected Фамилия beside ФИО in either order', ({ tableFields }) => {
    const metadata: ReportEntityMetadata = {
      entityName: 'Users',
      label: 'Отчет по пользователям',
      fields: [
        field('surname', 'Фамилия'),
        field('firstName', 'Имя'),
        field('middleName', 'Отчество'),
      ],
    };

    const request = buildReportQueryRequest({
      metadata,
      outputRows: [],
      fallbackReportTableFields: tableFields,
    });

    expect(request.selectedFields).toEqual(
      expect.arrayContaining([
        { fieldName: 'surname' },
        { fieldName: 'firstName' },
        { fieldName: 'middleName' },
        { fieldName: 'surname', alias: 'Фамилия' },
      ]),
    );
    expect(request.selectedFields).toHaveLength(4);
  });
});
