import * as yup from 'yup';

import type { ID } from '@shared/types/BaseQueryTypes';
import { ValidationMessages } from '@shared/validations/validation_messages';

export interface Form {
  name: string;
  usersPermission: ID;
  carsPermission: ID;
  alkolockPermission: ID;
  attachPermission: ID;
}

export const schema: yup.ObjectSchema<Form> = yup.object({
  name: yup.string().required(ValidationMessages.required),
  usersPermission: yup.string().required(ValidationMessages.required),
  carsPermission: yup.string().required(ValidationMessages.required),
  alkolockPermission: yup.string().required(ValidationMessages.required),
  attachPermission: yup.string().required(ValidationMessages.required),
});
