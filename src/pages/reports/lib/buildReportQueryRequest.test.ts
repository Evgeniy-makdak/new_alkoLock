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
  it('sends each metadata-provided user field independently', () => {
    const metadata: ReportEntityMetadata = {
      entityName: 'User',
      label: 'Отчет по пользователям',
      fields: [
        field('fullName', 'Пользователь'),
        field('surname', 'Фамилия'),
        field('firstName', 'Имя'),
        field('middleName', 'Отчество'),
      ],
    };

    const request = buildReportQueryRequest({
      metadata,
      outputRows: [],
      fallbackReportTableFields: [
        { value: 'fullName', label: 'Отчет по пользователям -> Пользователь' },
        { value: 'surname', label: 'Отчет по пользователям -> Фамилия' },
        { value: 'firstName', label: 'Отчет по пользователям -> Имя' },
        { value: 'middleName', label: 'Отчет по пользователям -> Отчество' },
      ],
    });

    expect(request.selectedFields).toEqual([
      { fieldName: 'fullName', label: 'Отчет по пользователям -> Пользователь' },
      { fieldName: 'surname', label: 'Отчет по пользователям -> Фамилия' },
      { fieldName: 'firstName', label: 'Отчет по пользователям -> Имя' },
      { fieldName: 'middleName', label: 'Отчет по пользователям -> Отчество' },
    ]);
  });

  it('sends only the leaf after -> as alias for a cloned compose row', () => {
    const metadata: ReportEntityMetadata = {
      entityName: 'DeviceEvent',
      label: 'Отчёт о событиях',
      fields: [field('user', 'Пользователь')],
    };

    const request = buildReportQueryRequest({
      metadata,
      outputRows: [],
      fallbackReportTableFields: [
        { value: 'user', label: 'Отчёт о событиях -> Пользователь' },
        { value: 'user#2', label: 'Отчёт о событиях -> Пользователь_1' },
      ],
    });

    expect(request.selectedFields).toEqual([
      { fieldName: 'user', label: 'Отчёт о событиях -> Пользователь' },
      {
        fieldName: 'user',
        label: 'Отчёт о событиях -> Пользователь_1',
        alias: 'Пользователь_1',
      },
    ]);
  });

  it('sends full renamed label as alias for a base row without forbidden chars', () => {
    const metadata: ReportEntityMetadata = {
      entityName: 'DeviceEvent',
      label: 'Отчёт о событиях',
      fields: [field('user', 'Пользователь')],
    };

    const request = buildReportQueryRequest({
      metadata,
      outputRows: [],
      fallbackReportTableFields: [
        { value: 'user', label: 'Мой_пользователь' },
      ],
    });

    expect(request.selectedFields).toEqual([
      {
        fieldName: 'user',
        label: 'Мой_пользователь',
        alias: 'Мой_пользователь',
      },
    ]);
  });
});
