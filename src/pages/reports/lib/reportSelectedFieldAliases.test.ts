import { describe, expect, it, jest } from '@jest/globals';

import {
  orderLabelsBySelectedFields,
  resolveOpenReportColumnHeaderLabels,
} from '../dashboard/lib/resolveOpenReportColumnHeaderLabels';
import { applyDashboardColumnHeaderLabelSnapshot } from '../dashboard/lib/applyDashboardColumnHeaderLabelSnapshot';
import { orderColumnKeysByHeaderHints } from './reportContentColumnOrder';
import { buildReportColumnHeaderLabelsFromComposeFields } from './reportSelectedFieldAliases';
import { restoreReportComposeTableFieldsFromQuery } from './restoreReportComposeTableFields';
import type { ReportQueryRequest } from '../types/reportApiTypes';

jest.mock('./buildReportTableFieldOptions', () => ({
  isReportTableFieldLabelAutoQualified: (label: string) =>
    label.includes(' -> ') || label.includes(' · '),
  QUALIFIED_LABEL_SEPARATOR: ' · ',
  ROOT_ENTITY_LABEL_SEPARATOR: ' -> ',
}));
jest.mock('./reportEntityCompositeFields', () => ({
  expandCompositeFieldPath: (path: string) =>
    path.replace(/#\d+$/, '') === '__composite.User'
      ? ['surname', 'firstName', 'middleName']
      : [path],
  isReportCompositeFieldPath: (path: string) => path.split('.').includes('__composite'),
  planReportCompositeResultColumns: () => ({}),
}));
jest.mock('../dashboard/lib/resolveWidgetColumnHeaderLabels', () => ({
  resolveWidgetColumnHeaderLabels: async () => ({
    'user.name': 'Пользователь -> Имя',
  }),
}));

describe('cloned report column labels', () => {
  it('restores a selected ФИО composite instead of its expanded member fields', () => {
    const selectedFields = [
      { fieldName: 'user.name' },
      { fieldName: 'surname' },
      { fieldName: 'firstName' },
      { fieldName: 'middleName' },
    ];
    const labels = {
      'user.name': 'Отчет по пользователям -> Пользователь',
      '__composite.User': 'Отчет по пользователям -> ФИО',
    };

    expect(restoreReportComposeTableFieldsFromQuery(selectedFields, labels)).toEqual([
      { value: 'user.name', label: 'Отчет по пользователям -> Пользователь' },
      { value: '__composite.User', label: 'Отчет по пользователям -> ФИО' },
    ]);
  });

  it('reapplies the UI label snapshot after the dashboard list reloads', () => {
    const widget: Parameters<typeof applyDashboardColumnHeaderLabelSnapshot>[0] = {
      title: 'Отчёт',
      entityName: 'Users',
      body: {
        selectedFields: [
          { fieldName: 'user.name', alias: 'Имя_1' },
          { fieldName: 'user.name' },
        ],
        filters: [],
      },
      preferredViewMode: 'table' as const,
      reportId: 7,
    };
    const columnHeaderLabels = {
      'user.name#2': 'Пользователь -> Имя_1',
      'user.name': 'Пользователь -> Имя',
      Имя_1: 'Пользователь -> Имя_1',
    };
    const snapshots = {
      '7': {
        selectedFields: [...widget.body.selectedFields].reverse(),
        columnHeaderLabels,
      },
    };

    expect(applyDashboardColumnHeaderLabelSnapshot(widget, snapshots).columnHeaderLabels).toEqual(
      columnHeaderLabels,
    );
  });

  it('keeps a clone moved above its original associated with its own label', () => {
    const tableFields = [
      { value: 'user.name#2', label: 'Пользователь -> Имя_1' },
      { value: 'user.name', label: 'Пользователь -> Имя' },
    ];
    const selectedFields = [{ fieldName: 'user.name', alias: 'Имя_1' }, { fieldName: 'user.name' }];
    const labels = buildReportColumnHeaderLabelsFromComposeFields(tableFields, selectedFields);

    expect(labels['Имя_1']).toBe('Пользователь -> Имя_1');
    expect(Object.keys(labels).slice(0, 2)).toEqual(['user.name#2', 'user.name']);
    expect(restoreReportComposeTableFieldsFromQuery(selectedFields, labels)).toEqual(tableFields);
  });

  it('associates a clone alias with its row when the original has no alias', () => {
    const tableFields = [
      { value: 'user.name', label: 'Пользователь -> Имя' },
      { value: 'user.name#2', label: 'Пользователь -> Имя_1' },
    ];
    const selectedFields = [{ fieldName: 'user.name' }, { fieldName: 'user.name', alias: 'Имя_1' }];
    const labels = buildReportColumnHeaderLabelsFromComposeFields(tableFields, selectedFields);

    expect(labels['Имя_1']).toBe('Пользователь -> Имя_1');
    expect(restoreReportComposeTableFieldsFromQuery(selectedFields, labels)).toEqual(tableFields);
  });

  it('preserves a user-edited clone alias without restoring the entity prefix', () => {
    const tableFields = [
      { value: 'user.name#2', label: 'Пользователь -> Короткое имя_1' },
      { value: 'user.name', label: 'Имя пользователя' },
    ];
    const selectedFields = [
      { fieldName: 'user.name', alias: 'Короткое_имя_1' },
      { fieldName: 'user.name', alias: 'Имя_пользователя' },
    ];
    const labels = buildReportColumnHeaderLabelsFromComposeFields(tableFields, selectedFields);

    expect(restoreReportComposeTableFieldsFromQuery(selectedFields, labels)).toEqual(tableFields);
  });

  it('orders result columns by the explicit composition keys', () => {
    const labels = {
      'user.name#2': 'Пользователь -> Имя_1',
      'user.name': 'Пользователь -> Имя',
      Имя_1: 'Пользователь -> Имя_1',
    };
    const selectedFields = [{ fieldName: 'user.name', alias: 'Имя_1' }, { fieldName: 'user.name' }];
    const contentKeys = ['Имя_1', 'user.name'];
    const aliasKeys = new Set(selectedFields.map((field) => field.alias).filter(Boolean));
    const headerHints = Object.keys(labels).filter(
      (key) => !aliasKeys.has(key) || selectedFields.some((field) => field.fieldName === key),
    );

    expect(orderColumnKeysByHeaderHints(contentKeys, headerHints, selectedFields)).toEqual([
      'Имя_1',
      'user.name',
    ]);
  });

  it('keeps composition-key order when dashboard labels are resolved for reopening', () => {
    const labels = {
      'user.name#2': 'Пользователь -> Имя_1',
      'user.name': 'Пользователь -> Имя',
      Имя_1: 'Пользователь -> Имя_1',
    };
    const selectedFields = [{ fieldName: 'user.name', alias: 'Имя_1' }, { fieldName: 'user.name' }];

    const ordered = orderLabelsBySelectedFields(labels, selectedFields);
    expect(
      Object.keys(ordered).filter((key) => key === 'user.name' || key.startsWith('user.name#')),
    ).toEqual(['user.name#2', 'user.name']);
  });

  it('restores a clone full label and first position from its numbered alias', async () => {
    const body: ReportQueryRequest = {
      selectedFields: [
        { fieldName: 'user.name', alias: 'Имя_1' },
        { fieldName: 'user.name' },
      ],
      filters: [],
    };

    const labels = await resolveOpenReportColumnHeaderLabels('Users', body);

    expect(labels['Имя_1']).toBe('Пользователь -> Имя_1');
    expect(
      restoreReportComposeTableFieldsFromQuery(body.selectedFields, labels),
    ).toEqual([
      { value: 'user.name#2', label: 'Пользователь -> Имя_1' },
      { value: 'user.name', label: 'Пользователь -> Имя' },
    ]);
  });
});
