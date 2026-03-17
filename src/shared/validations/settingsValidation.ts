import { ValidationMessages } from './validation_messages';

export class SettingsValidation {
  static validateTimeoutMinutes(value: number) {
    if (isNaN(value)) {
      return [ValidationMessages.notValidData];
    }
    if (value < 0) {
      return ['Значение не может быть отрицательным'];
    }
    if (!Number.isInteger(value)) {
      return ['Введите целое число'];
    }
    if (value > 1440) {
      return ['Максимальное значение - 1440 минут (сутки)'];
    }
    return [];
  }

  static validateTimeoutDays(value: number) {
    if (isNaN(value)) {
      return [ValidationMessages.notValidData];
    }
    if (value < 0) {
      return ['Значение не может быть отрицательным'];
    }
    if (!Number.isInteger(value)) {
      return ['Введите целое число'];
    }
    if (value > 365) {
      return ['Максимальное значение - 365 дней (год)'];
    }
    return [];
  }
}
