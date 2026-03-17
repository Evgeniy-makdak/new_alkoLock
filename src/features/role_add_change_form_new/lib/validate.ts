import * as yup from 'yup';

import { ValidationMessages } from '@shared/validations/validation_messages';

export interface Form {
  name?: string;
  createPermissions?: string[];
  readPermissions?: string[];
  updatePermissions?: string[];
  deletePermissions?: string[];
}

const validateRequiredField = (value: string, context: yup.TestContext<Form>) => {
  if (!value || value.trim().length === 0) {
    return context.createError({ message: ValidationMessages.required });
  }

  if (value.match(/^\s+|\s+$/g)) {
    // return context.createError({ message: 'В строке есть пробелы' });
  }

  return true;
};

export const schema = yup.object({
  name: yup.string().test({
    name: 'name',
    test(value, context) {
      return validateRequiredField(value, context);
    },
  }),
  createPermissions: yup.array().of(yup.string()),
  readPermissions: yup.array().of(yup.string()),
  updatePermissions: yup.array().of(yup.string()),
  deletePermissions: yup.array().of(yup.string()),
});
