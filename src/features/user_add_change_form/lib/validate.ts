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
      if (!value || !value.isValid()) {
        return context.createError({ message: ValidationMessages.notValidData });
      }

      const parent = context.parent;
      const licenseExpirationDate = parent?.licenseExpirationDate as Dayjs | null;
      if (
        licenseExpirationDate &&
        licenseExpirationDate.isValid() &&
        !value.isBefore(licenseExpirationDate)
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
      if (!value || !value.isValid()) {
        return context.createError({ message: ValidationMessages.notValidData });
      }

      const parent = context.parent;
      const licenseIssueDate = parent?.licenseIssueDate as Dayjs | null;
      if (licenseIssueDate && licenseIssueDate.isValid() && !licenseIssueDate.isBefore(value)) {
        return context.createError({ message: ValidationMessages.similarDateOfLicense });
      }
      return true;
    },
  );
});

yup.addMethod(yup.object, 'birthDate', function method(message) {
  return this.test(
    'birthDate',
    message,
    function validate(value: Dayjs | null, context: YupContext) {
      if (value && !value.isValid()) {
        return context.createError({ message: ValidationMessages.notValidData });
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

// Обновлённая схема валидации
export const schema = (id: ID, isGlobalAdmin: boolean): yup.ObjectSchema<Form> =>
  yup.object({
    licenseClass: yup.array().test({
      name: 'licenseClass',
      test(value, context: YupContext) {
        if (mustBeDate(context) && value?.length === 0) {
          return context.createError({ message: ValidationMessages.required });
        }
        return true;
      },
    }),
    firstName: yup.string().required(ValidationMessages.required),
    surname: isGlobalAdmin ? yup.string() : yup.string().required(ValidationMessages.required),
    middleName: yup.string(),
    birthDate: yup
      .mixed<any>()
      .nullable()
      .typeError(ValidationMessages.notValidData)
      .test('is-valid-birth-date', ValidationMessages.notValidData, (value) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return !value || (value.isValid() && value.isBefore(yesterday));
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
      .email(ValidationMessages.notValidEmail)
      .test({
        name: 'email',
        test(value, context) {
          if (value.length === 0) {
            return context.createError({ message: ValidationMessages.required });
          }
          if (ValidationRules.emailValidation(value).length > 0) {
            return context.createError({ message: ValidationMessages.notValidEmail });
          }
          return true;
        },
      }),
    password: yup.string().test({
      name: 'password',
      test(value, context) {
        if (value.length === 0 && !id) {
          return context.createError({ message: ValidationMessages.required });
        }
        if (value.length === 0 && id) return true;
        const errors = ValidationRules.minMaxValidation(
          (value ?? '').length,
          4,
          100,
          ValidationMessages.notValidPasswordLength,
        );
        if (errors.length > 0) {
          return context.createError({ message: errors[0] });
        }
        return true;
      },
    }),
    repeatPassword: yup.string().test({
      name: 'repeatPassword',
      test(value, context) {
        if (value !== context.parent.password) {
          return context.createError({ message: ValidationMessages.passwordsNotMustMatch });
        }
        return true;
      },
    }),
    disabled: yup.string().required(ValidationMessages.required),
    licenseCode: yup.string().test({
      name: 'licenseCode',
      test(value, context) {
        if (!value) return true;
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
      .test('is-valid-issue-date', ValidationMessages.notValidData, (value) => {
        const today = new Date();
        return !value || (value.isValid() && value.isBefore(today));
      }),
    licenseExpirationDate: yup
      .mixed<any>()
      .nullable()
      .typeError(ValidationMessages.notValidData)
      .test('is-valid-expiration-date', ValidationMessages.notValidData, (value) => {
        const today = new Date();
        return !value || (value.isValid() && value.isAfter(today));
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

  if (isNotGlobalAdminRole && isGlobalAdminRoleSelect) return true;
  else if (hasSelectedRoles && !isNotGlobalAdminRole && !isGlobalAdminRoleSelect) return true;
  return false;
};
