/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dayjs } from 'dayjs';
import * as yup from 'yup';

import type { ImageState } from '@entities/upload_img';
import { Permissions } from '@shared/config/permissionsEnums';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

export type Form = {
  firstName: string;
  surname: string;
  middleName: string;
  birthDate: Dayjs | null;
  phone: string;
  email: string;
  password: string;
  repeatPassword: string;
  userGroups: Values;
  licenseCode: string;
  licenseIssueDate: Dayjs | null;
  licenseExpirationDate: Dayjs | null;
  licenseClass: string[];
  disabled: ID;
  userPhotoDTO?: ImageState[];
};

export type KeyForm = keyof Form;

type YupContext = yup.TestContext<Form>;

yup.addMethod(yup.object, 'licenseIssueDate', function method(message) {
  return this.test(
    'licenseIssueDate',
    message,
    function validate(value: Dayjs | null, context: YupContext) {
      if (!mustBeDate(context)) return true;
      if (!isValidDate(value)) {
        return context.createError({ message: ValidationMessages.notValidData });
      }

      const parent = context.parent;
      const licenseExpirationDate = parent?.licenseExpirationDate as Dayjs | null;
      if (
        licenseExpirationDate &&
        isValidDate(licenseExpirationDate) &&
        !isDateBefore(value, licenseExpirationDate)
      ) {
        return context.createError({ message: ValidationMessages.similarDateOfLicense });
      }
      return true;
    },
  );
});

yup.addMethod(yup.object, 'licenseExpirationDate', function method(message) {
  return this.test(
    'licenseExpirationDate',
    message,
    function validate(value: Dayjs | null, context: YupContext) {
      if (!mustBeDate(context)) return true;
      if (!isValidDate(value)) {
        return context.createError({ message: ValidationMessages.notValidData });
      }

      const parent = context.parent;
      const licenseIssueDate = parent?.licenseIssueDate as Dayjs | null;
      if (
        licenseIssueDate &&
        isValidDate(licenseIssueDate) &&
        !isDateBefore(licenseIssueDate, value)
      ) {
        return context.createError({ message: ValidationMessages.similarDateOfLicense });
      }
      return true;
    },
  );
});

// Добавляем метод для валидации даты рождения с отображением сообщения "Некорректное значение"
yup.addMethod(yup.object, 'birthDate', function method(message) {
  return this.test(
    'birthDate',
    message,
    function validate(value: Dayjs | null, context: YupContext) {
      if (!isValidDate(value)) {
        return context.createError({ message: ValidationMessages.notValidData });
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1); // Устанавливаем вчерашнюю дату для проверки

      if (value && !isDateBefore(value, yesterday)) {
        return context.createError({ message: 'Некорректное значение' });
      }

      return true;
    },
  );
});

// Проверка, нужно ли проверять даты
const mustBeDate = (context: YupContext) => {
  const parent = context.parent;
  const licenseCode = parent?.licenseCode;
  return licenseCode && licenseCode.trim().length > 0;
};

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ПРОВЕРКИ ВАЛИДНОСТИ ДАТЫ (Dayjs и Date)
const isValidDate = (value: any): boolean => {
  if (!value) return false;

  // Для Dayjs объектов
  if (value.isValid && typeof value.isValid === 'function') {
    return value.isValid();
  }

  // Для Date объектов
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }

  return false;
};

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ СРАВНЕНИЯ ДАТ (date1 < date2)
const isDateBefore = (date1: any, date2: any): boolean => {
  if (!isValidDate(date1) || !isValidDate(date2)) return false;

  // Для Dayjs объектов
  if (date1.isBefore && typeof date1.isBefore === 'function') {
    return date1.isBefore(date2);
  }

  // Для Date объектов
  if (date1 instanceof Date && date2 instanceof Date) {
    return date1 < date2;
  }

  // Смешанные типы - конвертируем в timestamp
  const timestamp1 = getTimestamp(date1);
  const timestamp2 = getTimestamp(date2);

  return timestamp1 < timestamp2;
};

// ПОЛУЧЕНИЕ TIMESTAMP ИЗ ЛЮБОГО ТИПА ДАТЫ
const getTimestamp = (date: any): number => {
  if (!date) return 0;

  // Для Dayjs объектов
  if (date.valueOf && typeof date.valueOf === 'function') {
    return date.valueOf();
  }

  // Для Date объектов
  if (date instanceof Date) {
    return date.getTime();
  }

  return 0;
};

const isStringMatchGapStartOrFinish = (value: string) => {
  return value.match(/^\s+|\s+$/g);
};

// 🔧 FIX: Улучшенная валидация для обязательных полей - проверяем пробелы
const validateRequiredField = (value: string, context: yup.TestContext<Form>) => {
  if (!value || value.trim().length === 0) {
    return context.createError({ message: ValidationMessages.required });
  }

  if (isStringMatchGapStartOrFinish(value)) {
    // return context.createError({ message: 'В строке есть пробелы' });
  }

  return true;
};

const validatePassword = (value: string, context: yup.TestContext<Form>) => {
  if (isStringMatchGapStartOrFinish(value)) {
    return context.createError({ message: 'В строке есть пробелы' });
  }

  if (value.length < 8) {
    return context.createError({ message: 'Минимальная длина пароля должна быть 8 символов' });
  }

  if (
    !/^(?=.*[a-zA-Zа-яА-Я])(?=.*\d)[a-zA-Zа-яА-Я\d!"№;%:?*()_+\-=@#$%^&*{}[\]\\|",.'<>/?`~]+$/.test(
      value,
    )
  ) {
    return context.createError({
      message:
        'Пароль должен содержать буквы латинского и/или кириллического алфавитов, а также цифры. Допускаются спец.символы и знаки пунктуации',
    });
  }

  return true;
};

const validateEmail = (value: string, context: yup.TestContext<Form>) => {
  if (isStringMatchGapStartOrFinish(value)) {
    return context.createError({ message: 'В строке есть пробелы' });
  }

  if (value.length === 0) {
    return context.createError({ message: ValidationMessages.required });
  }

  const errors = ValidationRules.emailValidation(value);
  if (errors.length > 0) {
    return context.createError({ message: ValidationMessages.notValidEmail });
  }

  return true;
};

// ИЗМЕНЕНИЕ: Добавляем параметр hasDriverRole
export const schema = (
  id: ID,
  isGlobalAdmin: boolean,
  hasDriverRole?: boolean,
): yup.ObjectSchema<Form> =>
  yup.object({
    licenseClass: yup.array().test({
      name: 'licenseClass',
      test(value, context) {
        // 🔧 FIX: Валидация срабатывает ТОЛЬКО если есть роль водителя
        if (hasDriverRole && (!value || value.length === 0)) {
          return context.createError({ message: ValidationMessages.required });
        }
        return true;
      },
    }),

    firstName: yup.string().test({
      name: 'firstName',
      test(value, context) {
        // @ts-expect-error% временное решение
        return validateRequiredField(value, context);
      },
    }),
    surname: isGlobalAdmin
      ? yup.string()
      : yup.string().test({
          name: 'surname',
          test(value, context) {
            // @ts-expect-error% временное решение
            return validateRequiredField(value, context);
          },
        }),
    middleName: yup.string(),
    birthDate: yup
      .mixed<any>()
      .nullable()
      .typeError(ValidationMessages.notValidData)
      .test('is-valid-birth-date', 'Некорректное значение', (value) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return !value || (isValidDate(value) && isDateBefore(value, yesterday));
      }),
    phone: yup.string().test({
      name: 'phone',
      test(value, context) {
        if (!value || value.length === 0) {
          return true;
        }
        const errorMessage = ValidationRules.phoneValidation(value);
        if (errorMessage) {
          return context.createError({ message: errorMessage });
        }
        return true;
      },
    }),
    email: yup
      .string()
      .required(ValidationMessages.required)
      .test({
        name: 'email',
        // @ts-expect-error% временное решение
        test: (value, context) => validateEmail(value, context),
      }),
    password: yup.string().test({
      name: 'password',
      test(value, context) {
        if (value.length === 0 && !id) {
          return context.createError({ message: ValidationMessages.required });
        }
        if (value.length === 0 && id) return true;
        // @ts-expect-error% временное решение
        return validatePassword(value, context);
      },
    }),
    repeatPassword: yup.string().test({
      name: 'repeatPassword',
      test(value, context) {
        if (value !== context.parent.password) {
          return context.createError({ message: ValidationMessages.passwordsNotMustMatch });
        }
        if (value.length === 0) return true;
        // @ts-expect-error% временное решение
        return validatePassword(value, context);
      },
    }),
    disabled: yup.string().required(ValidationMessages.required),
    licenseCode: yup.string().test({
      name: 'licenseCode',
      test(value, context) {
        // 🔧 FIX: Валидация срабатывает ТОЛЬКО если есть роль водителя
        if (!hasDriverRole) {
          return true; // Если роли водителя нет - пропускаем валидацию
        }

        if (hasDriverRole && (!value || value.trim().length === 0)) {
          return context.createError({ message: ValidationMessages.required });
        }

        if (!value) return true;

        // 🔧 FIX: Дополнительная валидация номера ВУ тоже только при наличии роли водителя
        const licenseCode = (value || '')?.trim();
        const error = ValidationRules.driverLicenseValidation(licenseCode);
        if (error) {
          return context.createError({ message: error });
        }
        return true;
      },
    }),
    licenseIssueDate: yup
      .mixed<any>()
      .nullable()
      .typeError(ValidationMessages.notValidData)
      .test('is-valid-issue-date', ValidationMessages.notValidData, (value, context) => {
        // 🔧 FIX: Валидация срабатывает ТОЛЬКО если есть роль водителя
        const today = new Date();

        if (!hasDriverRole) return true;

        if (hasDriverRole && !value) {
          return context.createError({ message: ValidationMessages.required });
        }

        return !value || (isValidDate(value) && isDateBefore(value, today));
      }),
    licenseExpirationDate: yup
      .mixed<any>()
      .nullable()
      .typeError(ValidationMessages.notValidData)
      .test('is-valid-expiration-date', ValidationMessages.notValidData, (value, context) => {
        // 🔧 FIX: Валидация срабатывает ТОЛЬКО если есть роль водителя
        if (!hasDriverRole) return true;

        if (hasDriverRole && !value) {
          return context.createError({ message: ValidationMessages.required });
        }

        // УНИВЕРСАЛЬНАЯ ВАЛИДАЦИЯ ДЛЯ Dayjs И Date
        if (isValidDate(value)) {
          const now = new Date();
          // Для Dayjs объектов
          if (value.isAfter && typeof value.isAfter === 'function') {
            return value.isAfter(now);
          }
          // Для Date объектов
          if (value instanceof Date) {
            return value > now;
          }
          // Смешанное сравнение через timestamp
          return getTimestamp(value) > now.getTime();
        }

        return false;
      }),
    userGroups: yup.array().test({
      name: 'userGroups',
      test(value, context) {
        if (value.length === 0) {
          return context.createError({ message: ValidationMessages.required });
        }
        return true;
      },
    }),
    userPhotoDTO: yup.mixed<ImageState[]>().test({
      name: 'userPhotoDTO',
      test() {
        return true;
      },
    }),
  });

// Проверка ролей администратора
export const isDisabledAdminRole = (value: Value, roles: Values): boolean => {
  const permissions = value?.permissions || [];

  const selectedRolesPermissions = roles.reduce((prev, curr) => {
    const permissionsCurr = curr.permissions;

    if (!Array.isArray(permissionsCurr)) return prev;
    permissionsCurr.map((per) => {
      prev.push(per);
    });
    return prev;
  }, []);

  const hasSelectedRoles = selectedRolesPermissions.length > 0;
  const isGlobalAdminRoleSelect = selectedRolesPermissions.includes(
    Permissions.SYSTEM_GLOBAL_ADMIN,
  );
  const isNotGlobalAdminRole = !permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);

  return hasSelectedRoles && isNotGlobalAdminRole && isGlobalAdminRoleSelect;
};
