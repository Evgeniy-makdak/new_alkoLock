import dayjs, { Dayjs } from 'dayjs';
import * as yup from 'yup';
import { object } from 'yup';

import type { Value, Values } from '@shared/ui/search_multiple_select';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

import i18n from '../../../i18n';

export type Form = {
  mark: string;
  model: string;
  vin: string;
  registrationNumber: string;
  color: Values;
  type: Values;
  /** Пусто в форме добавления; после выбора года в DatePicker — Dayjs */
  year?: Dayjs | null;
  yearText?: string;
};

yup.addMethod(object, 'dayjs', function method(message) {
  return this.test('dayjs', message, function validate(value: Dayjs, ctx) {
    if (!value) {
      return ctx.createError({ message: ValidationMessages.required });
    }

    const isValid = value?.isValid && value?.isValid();

    if (!isValid) {
      return ctx.createError({ message: i18n.t('validation.notValidData') });
    }

    const year = value.year();
    if (year > maxYear) {
      return ctx.createError({ message: i18n.t('validation.yearNotAbove', { max: maxYear }) });
    } else if (year < minYear) {
      return ctx.createError({ message: i18n.t('validation.yearNotBelow', { min: minYear }) });
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
  yearText: yup.string().optional(),
  color: yup
    .array<Value, Value>()
    .min(1, i18n.t('validation.singleColorRequired'))
    .max(1, i18n.t('validation.singleColorRequired')),
  type: yup
    .array<Value, Value>()
    .min(1, i18n.t('validation.singleTypeRequired'))
    .max(1, i18n.t('validation.singleTypeRequired')),
});
