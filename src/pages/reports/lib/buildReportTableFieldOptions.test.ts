import { describe, expect, it, jest } from '@jest/globals';

import type { ReportEntityMetadata, ReportFieldDefinition } from '../types/reportApiTypes';
import {
  buildDefaultSelectedReportTableFieldOptions,
  mergeAllReportTableFieldOptions,
} from './buildReportTableFieldOptions';

jest.mock('./reportEntityCompositeFields', () => ({
  applyReportEntityCompositeFieldGrouping: (drafts: unknown) => drafts,
  expandCompositeFieldPath: (path: string) => [path],
  getReportEntityCompositeConfig: (): undefined => undefined,
  isReportCompositeFieldPath: () => false,
  parseCompositePath: (): null => null,
}));
jest.mock('./reportCoordinateComposite', () => ({
  COORDINATES_COMPOSITE_KIND: 'Coordinates',
  isReportCoordinatesCompositePath: () => false,
}));
jest.mock('./eventsForFrontReportOptions', () => ({
  isEventsForFrontTypeListAttribute: () => false,
}));

function field(
  fieldName: string,
  label: string,
  type: string,
  referenceEntity?: string,
): ReportFieldDefinition {
  return {
    fieldName,
    label,
    alias: null,
    type,
    referenceEntity,
    filterable: true,
    sortable: true,
    groupable: true,
    selectable: type !== 'ENTITY',
    aggregation: null,
    availableOperations: [],
    availableFunctions: [],
  };
}

describe('AutoServiceHistory user reference columns', () => {
  const userMetadata: ReportEntityMetadata = {
    entityName: 'User',
    label: 'Отчёт по пользователям',
    fields: [
      field('surname', 'Фамилия', 'STRING'),
      field('firstName', 'Имя', 'STRING'),
      field('middleName', 'Отчество', 'STRING'),
    ],
  };

  function getOptions(entityName: string, relationDefaultSelected = false) {
    const entityMetadata: ReportEntityMetadata = {
      entityName,
      label: 'Отчёт',
      fields: [
        {
          ...field('initiator', 'Инициатор', 'ENTITY', 'User'),
          defaultSelected: relationDefaultSelected,
        },
        {
          ...field('handler', 'Обработчик', 'ENTITY', 'User'),
          defaultSelected: relationDefaultSelected,
        },
      ],
    };

    return mergeAllReportTableFieldOptions(
      entityMetadata,
      [],
      new Map(),
      {},
      { User: userMetadata },
    );
  }

  it('keeps the User attributes available under both initiator and handler', () => {
    const options = getOptions('AutoServiceHistory');

    expect(options.map((option) => option.value)).toEqual([
      'initiator.surname',
      'initiator.firstName',
      'initiator.middleName',
      'handler.surname',
      'handler.firstName',
      'handler.middleName',
    ]);
    expect(options.map((option) => option.label)).toEqual([
      'Инициатор -> Фамилия',
      'Инициатор -> Имя',
      'Инициатор -> Отчество',
      'Обработчик -> Фамилия',
      'Обработчик -> Имя',
      'Обработчик -> Отчество',
    ]);
  });

  it('retains the existing same-leaf deduplication for other report entities', () => {
    const options = getOptions('OtherReport');

    expect(options).toHaveLength(3);
    expect(options.every((option) => /^(initiator|handler)\./.test(String(option.value)))).toBe(
      true,
    );
    expect(options.map((option) => String(option.value).split('.').slice(1).join('.'))).toEqual([
      'surname',
      'firstName',
      'middleName',
    ]);
  });

  it('uses each nested metadata field defaultSelected flag', () => {
    const entityMetadata: ReportEntityMetadata = {
      entityName: 'Events',
      label: 'Отчёт по событиям',
      fields: [
        {
          ...field('user', 'Пользователь', 'ENTITY', 'User'),
          defaultSelected: false,
        },
      ],
    };
    const userMetadataWithDefaults: ReportEntityMetadata = {
      ...userMetadata,
      fields: [
        { ...field('fullName', 'Пользователь', 'TEXT'), defaultSelected: true },
        { ...field('surname', 'Фамилия', 'TEXT'), defaultSelected: false },
      ],
    };
    const defaultOptions = buildDefaultSelectedReportTableFieldOptions(
      entityMetadata,
      [],
      new Map(),
      {},
      { User: userMetadataWithDefaults },
    );

    expect(defaultOptions).toEqual([
      { value: 'user.fullName', label: 'Пользователь -> Пользователь' },
    ]);

    const availableOptions = mergeAllReportTableFieldOptions(
      entityMetadata,
      [],
      new Map(),
      {},
      { User: userMetadataWithDefaults },
    );
    expect(availableOptions).toEqual([
      { value: 'user.fullName', label: 'Пользователь -> Пользователь' },
      { value: 'user.surname', label: 'Пользователь -> Фамилия' },
    ]);
  });

  it('uses the immediate parent relation label for deeper nested entities', () => {
    const entityMetadata: ReportEntityMetadata = {
      entityName: 'Events',
      label: 'Отчёт по событиям',
      fields: [field('device', 'Алкозамок', 'ENTITY', 'MonitoringDevice')],
    };
    const deviceMetadata: ReportEntityMetadata = {
      entityName: 'MonitoringDevice',
      label: 'Отчёт по алкозамкам',
      fields: [field('vehicle', 'ТС', 'ENTITY', 'Vehicle')],
    };
    const vehicleMetadata: ReportEntityMetadata = {
      entityName: 'Vehicle',
      label: 'Отчёт по ТС',
      fields: [field('manufacturer', 'Марка', 'STRING')],
    };
    const options = mergeAllReportTableFieldOptions(
      entityMetadata,
      [],
      new Map(),
      {},
      { MonitoringDevice: deviceMetadata, Vehicle: vehicleMetadata },
    );

    expect(options).toContainEqual({
      value: 'device.vehicle.manufacturer',
      label: 'ТС -> Марка',
    });
  });
});
