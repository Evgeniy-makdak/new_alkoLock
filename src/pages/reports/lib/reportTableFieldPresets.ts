import type { Values } from '@shared/ui/search_multiple_select';

import { isReportIdentifierFieldPath } from './reportTableFieldIdentifier';

import type { ReportEntityListItem } from '../types/reportApiTypes';

/**
 * Фронтовый пресет «сущности/атрибуты» для обязательных отчётов (ТЗ ALK-1572):
 * какие колонки доступны («Доступные колонки») и какие выбраны по умолчанию
 * («Текущий состав таблицы», жирные в ТЗ).
 *
 * Каждая позиция ТЗ — набор вариантов (вариант = путь-значение опции ИЛИ подпись
 * «Сущность -> …» / лист подписи). Сначала матчится точный путь/подпись (надёжно),
 * затем допускается вхождение ДЛИННОЙ фразы (>= 6 символов) в подпись — короткие
 * слова («Тип», «Имя», «Дата») не перехватывают чужие колонки.
 *
 * Несовпавшие позиции игнорируются. Сущности вне пресета не затрагиваются.
 */

export type ReportTableFieldPresetItem = string | string[];

export type ReportTableFieldPreset = {
  /** Корневая сущность отчёта (metadata.entityName). */
  entityName: string;
  /** Состав «Доступных колонок» в порядке ТЗ. */
  available: ReportTableFieldPresetItem[];
  /** «Текущий состав таблицы» по умолчанию (жирные позиции ТЗ). */
  defaults: ReportTableFieldPresetItem[];
};

/** Технические виртуальные сущности, скрытые от пользователей (ТЗ): «Водитель». */
const HIDDEN_REPORT_ENTITIES = new Set(['Driver']);

/** Вхождение длинной фразы в подпись — только для нетривиальных составных имён. */
const INCLUDES_MIN_LENGTH = 6;

export const REPORT_TABLE_FIELD_PRESETS: ReportTableFieldPreset[] = [
  {
    // 1. Отчёт о событиях
    entityName: 'DeviceEvent',
    available: [
      ['id', 'Идентификатор'],
      ['timestamp', 'Время события', 'Дата'],
      ['latitude', 'Широта', 'lat'],
      ['longitude', 'Долгота', 'lon'],
      ['user.fullName', 'Пользователь'],
      ['user.surname', 'Фамилия'],
      ['user.firstName', 'Имя'],
      ['user.middleName', 'Отчество'],
      ['user.email', 'Электронная почта', 'Email'],
      ['user.phone', 'Телефон'],
      ['device.fullName', 'device.name', 'Алкозамок'],
      ['device.name', 'Наименование', 'alias'],
      ['device.serialNumber', 'Серийный номер'],
      ['vehicle.fullName', 'vehicleRecord.fullName', 'vehicle.name', 'ТС'],
      ['vehicle.manufacturer', 'Производитель'],
      ['vehicle.model', 'Модель'],
      ['vehicle.registrationNumber', 'Государственный номер'],
      ['vehicle.type', 'Тип'],
      ['vehicle.color', 'Цвет'],
      ['vehicle.vin', 'VIN', 'vin'],
      ['vehicle.year', 'Год выпуска', 'Год'],
      ['eventsForFront.label', 'Тип события'],
      ['eventsForFront.level.label', 'Класс события', 'Уровень'],
    ],
    defaults: [
      ['id', 'Идентификатор'],
      ['timestamp', 'Время события', 'Дата'],
      ['user.fullName', 'Пользователь'],
      ['device.fullName', 'device.name', 'Алкозамок'],
      ['eventsForFront.label', 'Тип события'],
    ],
  },
  {
    // 2. Отчёт по пользователям (атрибуты «Водителя» включены в атрибуты пользователя)
    entityName: 'User',
    available: [
      ['id', 'Идентификатор'],
      ['fullName', 'Пользователь'],
      ['surname', 'Фамилия'],
      ['firstName', 'Имя'],
      ['middleName', 'Отчество'],
      ['birthDate', 'Дата рождения'],
      ['email', 'Электронная почта', 'Email'],
      ['phone', 'Телефон'],
      ['driver.licenseCode', 'licenseCode', 'Номер ВУ'],
      ['driver.licenseIssueDate', 'licenseIssueDate', 'Дата выдачи ВУ'],
      ['driver.licenseExpirationDate', 'licenseExpirationDate', 'Дата окончания действия ВУ'],
      ['driver.licenseClass', 'licenseClass', 'licenceClass', 'Категории ВУ'],
    ],
    defaults: [
      ['id', 'Идентификатор'],
      ['fullName', 'Пользователь'],
      ['birthDate', 'Дата рождения'],
      ['email', 'Электронная почта', 'Email'],
      ['phone', 'Телефон'],
      ['driver.licenseCode', 'licenseCode', 'Номер ВУ'],
    ],
  },
  {
    // 3. Отчёт по алкозамкам
    entityName: 'MonitoringDevice',
    available: [
      ['id', 'Идентификатор'],
      ['fullName', 'Алкозамок'],
      ['name', 'Наименование', 'alias'],
      ['serialNumber', 'Серийный номер'],
      ['mode', 'Режим'],
      ['vehicleBind.createdAt', 'createdAt', 'Дата установки на ТС'],
      ['vehicleBind.createdBy.fullName', 'createdBy.fullName', 'Кем установлен'],
      ['vehicle.fullName', 'vehicleRecord.fullName', 'vehicle.name', 'ТС'],
      ['vehicle.manufacturer', 'Производитель'],
      ['vehicle.model', 'Модель'],
      ['vehicle.registrationNumber', 'Государственный номер'],
      ['vehicle.type', 'Тип'],
      ['vehicle.color', 'Цвет'],
      ['vehicle.vin', 'VIN', 'vin'],
      ['vehicle.year', 'Год выпуска', 'Год'],
    ],
    defaults: [
      ['id', 'Идентификатор'],
      ['name', 'Наименование', 'alias'],
      ['serialNumber', 'Серийный номер'],
      ['mode', 'Режим'],
      ['vehicleBind.createdAt', 'createdAt', 'Дата установки на ТС'],
      ['vehicleBind.createdBy.fullName', 'createdBy.fullName', 'Кем установлен'],
      ['vehicle.fullName', 'vehicleRecord.fullName', 'ТС'],
    ],
  },
  {
    // 4. Отчёт по ТС
    entityName: 'Vehicle',
    available: [
      ['id', 'Идентификатор'],
      ['fullName', 'ТС'],
      ['manufacturer', 'Производитель'],
      ['model', 'Модель'],
      ['registrationNumber', 'Государственный номер'],
      ['type', 'Тип'],
      ['color', 'Цвет'],
      ['vin', 'VIN', 'vin'],
      ['year', 'Год выпуска', 'Год'],
      ['monitoringDevice.fullName', 'device.fullName', 'Алкозамок'],
      ['monitoringDevice.name', 'device.name', 'Наименование', 'alias'],
      ['monitoringDevice.serialNumber', 'device.serialNumber', 'Серийный номер'],
      ['monitoringDevice.mode', 'device.mode', 'Режим'],
      ['vehicleBind.createdAt', 'Дата установки на ТС', 'createdAt'],
      ['vehicleBind.createdBy.fullName', 'Кем установлен', 'createdBy.fullName'],
    ],
    defaults: [
      ['id', 'Идентификатор'],
      ['manufacturer', 'Производитель'],
      ['model', 'Модель'],
      ['registrationNumber', 'Государственный номер'],
      ['type', 'Тип'],
      ['color', 'Цвет'],
      ['vin', 'VIN', 'vin'],
      ['year', 'Год выпуска', 'Год'],
    ],
  },
  {
    // 5. Отчёт по истории автосервиса
    entityName: 'AutoServiceHistory',
    available: [
      ['id', 'Идентификатор'],
      ['createdAt', 'Дата создания'],
      ['eventDate', 'event_date', 'Дата закрытия заявки'],
      ['service_history_events_for_front.label', 'Результат'],
      ['fullName', 'Пользователь'],
      ['surname', 'Фамилия'],
      ['firstName', 'Имя'],
      ['middleName', 'Отчество'],
      ['email', 'Электронная почта', 'Email'],
      ['phone', 'Телефон'],
      ['monitoringDevice.fullName', 'device.fullName', 'Алкозамок'],
      ['monitoringDevice.name', 'device.name', 'Наименование', 'alias'],
      ['monitoringDevice.serialNumber', 'device.serialNumber', 'Серийный номер'],
      ['vehicle.fullName', 'vehicleRecord.fullName', 'ТС'],
      ['vehicle.manufacturer', 'Производитель'],
      ['vehicle.model', 'Модель'],
      ['vehicle.registrationNumber', 'Государственный номер'],
      ['vehicle.type', 'Тип'],
      ['vehicle.color', 'Цвет'],
      ['vehicle.vin', 'VIN', 'vin'],
      ['vehicle.year', 'Год выпуска', 'Год'],
    ],
    defaults: [
      ['id', 'Идентификатор'],
      ['createdAt', 'Дата создания'],
      ['eventDate', 'event_date', 'Дата закрытия заявки'],
      ['service_history_events_for_front.label', 'Результат'],
      ['fullName', 'Пользователь'],
      ['vehicle.fullName', 'vehicleRecord.fullName', 'ТС'],
    ],
  },
];

function normalizePresetNeedle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function optionLabelLeaf(label: string): string {
  const arrow = ' -> ';
  const idx = label.lastIndexOf(arrow);
  return idx >= 0 ? label.slice(idx + arrow.length) : label;
}

function optionMatchesNeedle(
  option: { value?: unknown; label?: unknown },
  needle: string,
): boolean {
  const n = normalizePresetNeedle(needle);
  if (!n) return false;
  const value = normalizePresetNeedle(String(option?.value ?? ''));
  if (value === n) return true;
  const rawLabel = String(option?.label ?? '').trim();
  if (!rawLabel) return false;
  const label = normalizePresetNeedle(rawLabel);
  if (label === n) return true;
  const leaf = normalizePresetNeedle(optionLabelLeaf(rawLabel));
  if (leaf === n) return true;
  // Только длинная составная фраза может входить в подпись («Дата установки на ТС»,
  // «Дата окончания действия ВУ») — короткие слова («Тип», «Имя», «Дата») не
  // перехватывают чужие колонки.
  if (n.length >= INCLUDES_MIN_LENGTH && label.includes(n)) return true;
  return false;
}

function itemNeedles(item: ReportTableFieldPresetItem): string[] {
  return Array.isArray(item) ? item : [item];
}

function pickPresetOptions(options: Values, items: ReportTableFieldPresetItem[]): Values {
  const result = new Map<string, Values[number]>();
  for (const item of items) {
    for (const needle of itemNeedles(item)) {
      const match = options.find((option) => {
        const key = String(option?.value ?? '');
        return key !== '' && !result.has(key) && optionMatchesNeedle(option, needle);
      });
      if (match) {
        result.set(String(match.value), match);
        break;
      }
    }
  }
  return Array.from(result.values());
}

/** «Доступные колонки» по пресету; если сущность не в пресете — без изменений. */
export function applyReportTableFieldPresetAvailable(
  entityName: string,
  options: Values,
): Values {
  const preset = REPORT_TABLE_FIELD_PRESETS.find((p) => p.entityName === entityName);
  if (!preset) return options;
  const picked = pickPresetOptions(options, preset.available);
  // Пустой результат значил бы скрытие секции колонок — возвращаем исходный список.
  return picked.length > 0 ? picked : options;
}

/** «Текущий состав» по умолчанию (bold) по пресету; если сущность не в пресете — пусто. */
export function applyReportTableFieldPresetDefaults(
  entityName: string,
  options: Values,
): Values {
  const preset = REPORT_TABLE_FIELD_PRESETS.find((p) => p.entityName === entityName);
  if (!preset) return [];
  // Идентификатор (id / *.id) — только вручную из «Доступных», не в дефолтном составе.
  return pickPresetOptions(options, preset.defaults).filter(
    (item) => !isReportIdentifierFieldPath(String(item.value ?? '')),
  );
}

/** Скрытие технических сущностей (например «Водитель») из списка отчётов. */
export function filterComposeReportEntities(
  entities: ReportEntityListItem[],
): ReportEntityListItem[] {
  if (!entities?.length) return entities;
  return entities.filter((entity) => !HIDDEN_REPORT_ENTITIES.has(String(entity?.entityName ?? '')));
}
