import * as yup from 'yup';

import i18n from '../../../i18n';

export type Form = {
  verificationCode: string;
  email: string; // Добавляем email, который будем получать из location state
};

export const schema: yup.ObjectSchema<Form> = yup.object({
  verificationCode: yup
    .string()
    .required(() => i18n.t('validation.required'))
    .length(6, () => i18n.t('validation.verificationCodeLength')),
  email: yup.string().required(), // Email будет обязательным, но не валидируем его здесь
});
