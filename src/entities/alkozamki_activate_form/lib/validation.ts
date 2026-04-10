import * as yup from 'yup';

import { ValidationMessages } from '@shared/validations/validation_messages';

import i18n from '../../../i18n';

export interface Form {
  duration: number;
}

export const schema: yup.ObjectSchema<Form> = yup
  .object({
    duration: yup
      .number()
      .transform((val, originalValue) => {
        if (originalValue === '' || originalValue === null || originalValue === undefined) {
          return undefined;
        }
        return Number.isNaN(val) ? undefined : val;
      })
      .typeError(() => i18n.t('serviceMode.durationMustBeNumber'))
      .required(ValidationMessages.required)
      .integer(() => i18n.t('serviceMode.durationMustBeNumber'))
      .min(1, () => i18n.t('serviceMode.durationMustBePositive'))
      .max(99, () => i18n.t('serviceMode.durationMaxHours', { max: 99 })),
  })
  .required(ValidationMessages.required);
