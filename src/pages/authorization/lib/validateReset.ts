import * as yup from 'yup';

import i18n from '../../../i18n';

export type Form = {
  email: string; // email обязателен
};

export const schema: yup.ObjectSchema<Form> = yup.object({
  email: yup
    .string()
    .required(() => i18n.t('validation.required'))
    .email(() => i18n.t('validation.notValidEmail'))
    .matches(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, () =>
      i18n.t('validation.notValidEmail'),
    ) as yup.StringSchema<string>,
});
