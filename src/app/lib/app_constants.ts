import type { IEventsType } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';

export class AppConstants {
  static rolesSystemList = [
    {
      value: 1,
      label: 'Администратор системы',
    },
    {
      value: 2,
      label: 'Администратор филиала',
    },
    {
      value: 3,
      label: 'Оператор',
    },
    {
      value: 4,
      label: 'Диспетчер',
    },
    {
      value: 5,
      label: 'Водитель',
    },
    {
      value: 6,
      label: 'Сервисный работник',
    },
  ];
  // TODO => убрать
  static permissionsList = [
    {
      value: 1,
      label: 'Чтение и Запись',
    },
    {
      value: 2,
      label: 'Чтение',
    },
    {
      value: 3,
      label: 'Недоступно',
    },
  ];

  static accessList = [
    {
      value: false,
      label: 'Разрешен',
    },
    {
      value: true,
      label: 'Запрещен',
    },
  ];

  static carColorsList: Values = [
    {
      value: 'BLACK',
      label: 'Черный',
    },
    {
      value: 'BLUE',
      label: 'Синий',
    },
    {
      value: 'GREEN',
      label: 'Зеленый',
    },
    {
      value: 'BEIGE',
      label: 'Бежевый',
    },
    {
      value: 'RED',
      label: 'Красный',
    },
    {
      value: 'VIOLET',
      label: 'Фиолетовый',
    },
    {
      value: 'ORANGE',
      label: 'Оранжевый',
    },
    {
      value: 'YELLOW',
      label: 'Желтый',
    },
    {
      value: 'WHITE',
      label: 'Белый',
    },
    {
      value: 'BROWN',
      label: 'Коричневый',
    },
    {
      value: 'GREY',
      label: 'Серый',
    },
  ];

  static carTypesList: Values = [
    {
      value: 'PERSONAL',
      label: 'Автомобиль',
    },
    {
      value: 'PASSENGER',
      label: 'Автобус',
    },
    {
      value: 'FREIGHT',
      label: 'Грузовое ТС',
    },
    {
      value: 'AGRICULTURAL',
      label: 'С/х техника',
    },
    {
      value: 'TAXI',
      label: 'Такси',
    },
    {
      value: 'SHARED',
      label: 'Каршеринг',
    },
    {
      value: 'OTHER',
      label: 'Прочее',
    },
  ];

  static categoryTypesList = [
    {
      value: 'A',
      label: 'A',
    },
    {
      value: 'B',
      label: 'B',
    },
    {
      value: 'C',
      label: 'C',
    },
    {
      value: 'D',
      label: 'D',
    },
    {
      value: 'E',
      label: 'E',
    },
    {
      value: 'BE',
      label: 'BE',
    },
    {
      value: 'CE',
      label: 'CE',
    },
    {
      value: 'DE',
      label: 'DE',
    },
    {
      value: 'C1E',
      label: 'C1E',
    },
    {
      value: 'D1E',
      label: 'D1E',
    },
    {
      value: 'M',
      label: 'M',
    },
    {
      value: 'A1',
      label: 'A1',
    },
    {
      value: 'B1',
      label: 'B1',
    },
    {
      value: 'C1',
      label: 'C1',
    },
    {
      value: 'D1',
      label: 'D1',
    },
  ];

  static ServiceModeTypes = {
    pending_by_driver: 'pending_by_driver',
    pending_by_system: 'pending_by_system',
    on: 'on',
    off: 'off',
    driver_accept: 'driver_accept',
  };

  static alkolockWorkModes = [
    {
      value: 'MAINTENANCE',
      label: 'Автосервис',
    },
    {
      value: 'NORMAL',
      label: 'Рабочий',
    },
    {
      value: 'EMERGENCY',
      label: 'Аварийный',
    },
  ];

  static alcolockServiceProcesses = [
    {
      value: 'SWITCHING_ON',
      label: 'Включение',
    },
    {
      value: 'SWITCHING_OFF',
      label: 'Выключение',
    },
  ];

  static alcolockServiceTypes = [
    {
      value: 'OFFLINE_SWITCH',
      label: 'Офлайн-переключение',
    },
    {
      value: 'DRIVER_WAITING',
      label: 'Ожидание водителя',
    },
    {
      value: 'OPERATOR_WAITING',
      label: 'Ожидание оператора',
    },
    {
      value: 'DRIVER_ACCEPT',
      label: 'Водитель подтвердил',
    },
    {
      value: 'DRIVER_CANCEL',
      label: 'Водитель отклонил',
    },
  ];

  static EVENT_TYPES = Object.freeze({
    // event types
    alcolockEventStartedRegularMode: 'ALCOLOCK_EVENT_STARTED_REGULAR_MODE',
    alcolockEventStartedMaintenanceMode: 'ALCOLOCK_EVENT_STARTED_MAINTENANCE_MODE',
    alcolockEventIgnitionStarted: 'ALCOLOCK_EVENT_IGNITION_STARTED',
    alcolockEventIgnitionStopped: 'ALCOLOCK_EVENT_IGNITION_STOPPED',
    alcolockEventEngineBlocked: 'ALCOLOCK_EVENT_ENGINE_BLOCKED',
    alcolockEventEngineUnblocked: 'ALCOLOCK_EVENT_ENGINE_UNBLOCKED',
    alcolockEventMaintenanceModeOn: 'ALCOLOCK_EVENT_MAINTENANCE_MODE_ON',
    alcolockEventMaintenanceModeOff: 'ALCOLOCK_EVENT_MAINTENANCE_MODE_OFF',
    alcolockEventEmergencyModeOn: 'ALCOLOCK_EVENT_EMERGENCY_MODE_ON',
    alcolockEventEmergencyModeOff: 'ALCOLOCK_EVENT_EMERGENCY_MODE_OFF',
    alcolockEventDoorOpened: 'ALCOLOCK_EVENT_DOOR_OPENED',
    alcolockEventDoorClosed: 'ALCOLOCK_EVENT_DOOR_CLOSED',
    alcolockEventBlockedUnauthorized: 'ALCOLOCK_EVENT_BLOCKED_UNAUTHORIZED',
    alcolockEventBlockedTimeout: 'ALCOLOCK_EVENT_BLOCKED_TIMEOUT',
    alcolockError: 'ALCOLOCK_ERROR',
    sobrietyTest: 'SOBRIETY_TEST',
  });

  static eventTypesList: IEventsType = [
    {
      value: this.EVENT_TYPES.alcolockEventStartedRegularMode,
      label: 'Включение',
    },

    {
      value: 'SERVICE_MODE_ACTIVATE',
      label: 'Переход в сервисный режим',
    },
    {
      value: 'SERVICE_MODE_DEACTIVATE',
      label: 'Выход из сервисного режима',
    },
    {
      value: this.EVENT_TYPES.alcolockEventStartedMaintenanceMode,
      label: 'Включение в сервисном режиме',
    },
    {
      value: this.EVENT_TYPES.alcolockEventIgnitionStarted,
      label: 'Включение зажигания',
    },
    {
      value: this.EVENT_TYPES.alcolockEventEngineBlocked,
      label: 'Блокировка двигателя',
    },
    {
      value: this.EVENT_TYPES.alcolockEventEngineUnblocked,
      label: 'Разблокировка двигателя',
    },
    {
      value: this.EVENT_TYPES.alcolockEventMaintenanceModeOff,
      label: 'Выход из режима "Атвосервис"',
    },
    {
      value: this.EVENT_TYPES.alcolockEventEmergencyModeOn,
      label: 'Переход в аварийный режим',
    },
    {
      value: this.EVENT_TYPES.alcolockEventEmergencyModeOff,
      label: 'Выход из аварийного режима',
    },
    {
      value: this.EVENT_TYPES.alcolockEventDoorOpened,
      label: 'Открытие двери',
    },
    {
      value: this.EVENT_TYPES.alcolockEventDoorClosed,
      label: 'Закрытие двери',
    },

    {
      value: this.EVENT_TYPES.alcolockEventBlockedUnauthorized,
      label: 'Блокировка при неразрешенном движении',
    },
    {
      value: this.EVENT_TYPES.alcolockEventBlockedTimeout,
      label: 'Блокировка по истечении таймера (5мин)',
    },

    {
      value: this.EVENT_TYPES.alcolockError,
      label: 'Ошибка устройства',
    },
    {
      value: this.EVENT_TYPES.sobrietyTest,
      label: 'Тестирование',
    },

    {
      value: 'ALCOLOCK_EVENT_IGNITION_STOPPED',
      label: 'Выключение зажигания',
    },

    {
      value: this.EVENT_TYPES.alcolockEventMaintenanceModeOn,
      label: 'Переход в режим "Автосервис"',
    },
  ];

  static sobrietyTypesList = [
    {
      value: 1,
      label: 'Трезвый',
    },
    {
      value: 2,
      label: 'Нетрезвый',
    },
    {
      value: 3,
      label: 'Слабый выдох',
    },
    {
      value: 4,
      label: 'Фальсификация выдоха',
    },
  ];

  static cancelTxt = 'Отмена';
  static deleteTxt = 'Удалить';
  static saveTxt = 'Сохранить';
  static addTxt = 'Добавить';

  static notSelectedOption = {
    value: 0,
    label: 'Не выбрано',
  };

  static OrderTypes = {
    asc: 'asc',
    desc: 'desc',
  };
}
