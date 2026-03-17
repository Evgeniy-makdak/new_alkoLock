import * as yup from 'yup';

import { ValidationMessages } from '@shared/validations/validation_messages';

export type Form = {
  verificationCode: string;
  email: string; // Добавляем email, который будем получать из location state
};

export const schema: yup.ObjectSchema<Form> = yup.object({
  verificationCode: yup
    .string()
    .required(ValidationMessages.required)
    .length(6, 'Код должен содержать 6 символов'),
  email: yup.string().required(), // Email будет обязательным, но не валидируем его здесь
});
