import dayjs, { Dayjs } from 'dayjs';
import * as yup from 'yup';
import { object } from 'yup';

import type { Value, Values } from '@shared/ui/search_multiple_select';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

export type Form = {
  mark: string;
  model: string;
  vin: string;
  registrationNumber: string;
  color: Values;
  type: Values;
  year?: Dayjs;
};

yup.addMethod(object, 'dayjs', function method(message) {
  return this.test('dayjs', message, function validate(value: Dayjs, ctx) {
    if (!value) {
      return ctx.createError({ message: ValidationMessages.required });
    }

    const isValid = value?.isValid && value?.isValid();

    if (!isValid) {
      return ctx.createError({ message: 'Невалидное значение' });
    }

    const year = value.year();
    if (year > maxYear) {
      return ctx.createError({ message: `Год не должен превышать ${maxYear}` });
    } else if (year < minYear) {
      return ctx.createError({ message: `Год должен быть не ниже ${minYear}` });
    }
    return true;
  });
});

const date = new Date();
const maxYear = dayjs(date).year();
const minYear = 1900;

// 🔧 FIX: Добавляем валидацию для проверки пробелов в обязательных полях
const validateRequiredField = (value: string, context: yup.TestContext<Form>) => {
  if (!value || value.trim().length === 0) {
    return context.createError({ message: ValidationMessages.required });
  }

  if (value.match(/^\s+|\s+$/g)) {
    // return context.createError({ message: 'В строке есть пробелы' });
  }

  return true;
};

export const schema: yup.ObjectSchema<Form> = yup.object({
  mark: yup.string().test({
    name: 'mark',
    test(value, context) {
      // @ts-expect-error временное решение
      return validateRequiredField(value, context);
    },
  }),
  model: yup.string().test({
    name: 'model',
    test(value, context) {
      // @ts-expect-error временное решение
      return validateRequiredField(value, context);
    },
  }),
  vin: yup
    .string()
    .test({
      name: 'vin',
      test(value, ctx) {
        const requiredError = ValidationRules.requiredValidation(value);
        if (requiredError) {
          return ctx.createError({ message: requiredError });
        }

        const vinError = ValidationRules.vinValidator(value);
        if (vinError) {
          return ctx.createError({ message: vinError });
        }

        return true;
      },
    })
    .required(ValidationMessages.required),
  registrationNumber: yup.string().test({
    name: 'registrationNumber',
    test(value, context) {
      // @ts-expect-error временное решение
      return validateRequiredField(value, context);
    },
  }),
  // TODO => разобраться с типами
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  year: object().dayjs().required(ValidationMessages.required),
  color: yup
    .array<Value, Value>()
    .min(1, 'Поле "Цвет" должно содержать 1 значение')
    .max(1, 'Поле "Цвет" должно содержать 1 значение'),
  type: yup
    .array<Value, Value>()
    .min(1, 'Поле "Тип" должно содержать 1 значение')
    .max(1, 'Поле "Тип" должно содержать 1 значение'),
});
