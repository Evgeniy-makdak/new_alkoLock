import type { Dayjs } from 'dayjs';
import * as yup from 'yup';
import { object } from 'yup';

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

// const isSameDate = (val1: Dayjs, val2: Dayjs) => {
//   return val1.date() === val2.date() && val1.month() === val2.month() && val1.year() === val2.year();
// };

yup.addMethod(object, 'licenseIssueDate', function method(message) {
  return this.test(
    'licenseIssueDate',
    message,
    function validate(value: Dayjs, context: YupContext) {
      if (!mustBeDate(context)) return true;
      if (!value) {
        return context.createError({ message: ValidationMessages.required });
      }
      const isValid = 'isValid' in value && value.isValid();
      if (!isValid) {
        return context.createError({ message: ValidationMessages.notValidData });
      }

      const parent = context.parent;
      const licenseExpirationDate = parent?.licenseExpirationDate as Dayjs;
      const isValidExpirationDate =
        licenseExpirationDate &&
        'isValid' in licenseExpirationDate &&
        licenseExpirationDate.isValid();
      if (!isValidExpirationDate) return true;
      if (!value.isBefore(licenseExpirationDate)) {
        return context.createError({ message: ValidationMessages.similarDateOfLicense });
      }
      return true;
    },
  );
});

yup.addMethod(object, 'licenseExpirationDate', function method(message) {
  return this.test(
    'licenseExpirationDate',
    message,
    function validate(value: Dayjs, context: YupContext) {
      if (!mustBeDate(context)) return true;
      if (!value) {
        return context.createError({ message: ValidationMessages.required });
      }
      const isValid = 'isValid' in value && value.isValid();
      if (!isValid) {
        return context.createError({ message: ValidationMessages.notValidData });
      }
      const parent = context.parent;
      const licenseIssueDate = parent?.licenseIssueDate;
      const isValidIssueDate =
        licenseIssueDate && 'isValid' in licenseIssueDate && licenseIssueDate.isValid();
      if (!isValidIssueDate) return true;
      if (!licenseIssueDate.isBefore(value)) {
        return context.createError({ message: ValidationMessages.similarDateOfLicense });
      }
      return true;
    },
  );
});

yup.addMethod(object, 'birthDate', function method(message) {
  return this.test('birthDate', message, function validate(value: Dayjs, context: YupContext) {
    if (!value) return true;
    const isValid = 'isValid' in value && value.isValid();
    if (!isValid) {
      return context.createError({ message: ValidationMessages.notValidData });
    }
    return true;
  });
});

const mustBeDate = (context: YupContext) => {
  const parent = context.parent;
  const licenseCode = parent?.licenseCode;

  return licenseCode && licenseCode?.trim() > 0;
};

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    birthDate: yup.object().birthDate().nullable(),
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
      .object()
      // TODO => разобраться с типами
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      .licenseIssueDate()
      .typeError(ValidationMessages.notValidData)
      .nullable(),
    licenseExpirationDate: yup
      .object()
      // TODO => разобраться с типами
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      .licenseExpirationDate()
      .nullable()
      .typeError(ValidationMessages.notValidData),
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
// TODO => переработать работу с ролями когда изменится api на бэке
export const isDisabledAdminRole = (value: Value, roles: Values): boolean => {
  const permissions = value?.permissions || [];

  const selectedRolesPermissions = roles.reduce((prev, curr) => {
    const permissionsCurr = curr.permissions;

    if (!Array.isArray(permissionsCurr)) return prev;
    permissionsCurr?.map((per) => {
      prev.push(per);
    });
    return prev;
  }, []);

  const hasSelectedRoles = selectedRolesPermissions.length > 0;
  const isGlobalAdminRoleSelect = selectedRolesPermissions?.includes(
    Permissions.SYSTEM_GLOBAL_ADMIN,
  );
  const isNotGlobalAdminRole = !permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);

  if (isNotGlobalAdminRole && isGlobalAdminRoleSelect) return true;
  else if (hasSelectedRoles && !isNotGlobalAdminRole && !isGlobalAdminRoleSelect) return true;
  return false;
};
