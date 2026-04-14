/* eslint-disable prettier/prettier */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import { useResetPasswordApi } from '@pages/authorization/api/useResetPassworApi';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';

import i18n from '../../../i18n';
import { Form, schema } from '../lib/validateReset';

interface ResetPasswordResponse {
  status: number;
  data: {
    message: string;
    data: string; // Дата в формате "2025-04-30T10:13:00.335120860Z"
  };
  detail?: string;
}

// Функция для преобразования GMT времени в локальное время браузера
const convertGMTtoLocal = (gmtTimeString: string): string => {
  try {
    const date = new Date(gmtTimeString);
    return date.toLocaleString(); // Автоматически использует локальный формат браузера
  } catch (error) {
    // console.error('Ошибка преобразования времени:', error);
    return gmtTimeString; // Возвращаем оригинальную строку в случае ошибки
  }
};

// Функция для обработки сообщений об ошибках с преобразованием времени
const processErrorMessage = (errorMessage: string): string => {
  if (!errorMessage) {
    return errorMessage;
  }

  try {
    // Ищем временную метку в формате "22 авг. 2025 г., 10:37:07"
    const timeMatch = errorMessage.match(/(\d{1,2} [а-я]+\. \d{4} г., \d{1,2}:\d{2}:\d{2})/);

    if (timeMatch && timeMatch[1]) {
      const gmtTime = timeMatch[1];

      // Преобразуем русский формат в ISO формат для корректного парсинга
      const months: { [key: string]: string } = {
        'янв.': '01',
        'фев.': '02',
        'мар.': '03',
        'апр.': '04',
        'мая.': '05',
        'июн.': '06',
        'июл.': '07',
        'авг.': '08',
        'сен.': '09',
        'окт.': '10',
        'ноя.': '11',
        'дек.': '12',
      };

      const timeParts = gmtTime.match(/(\d{1,2}) ([а-я]+)\. (\d{4}) г., (\d{1,2}):(\d{2}):(\d{2})/);

      if (timeParts) {
        const [, day, month, year, hours, minutes, seconds] = timeParts;
        const monthNumber = months[month] || '01';

        // Создаем ISO строку для парсинга
        const isoTimeString = `${year}-${monthNumber}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes}:${seconds}Z`;

        // Преобразуем в локальное время
        const localTime = convertGMTtoLocal(isoTimeString);

        // Заменяем GMT время на локальное в сообщении об ошибке
        return errorMessage.replace(gmtTime, localTime);
      }
    }
  } catch (error) {
    // console.error('Ошибка при обработке сообщения об ошибке:', error);
  }

  return errorMessage;
};

export const useResetPassword = () => {
  const navigate = useNavigate();

  const {
    handleSubmit,
    register,
    formState: {
      errors: { email },
    },
    setError,
  } = useForm<Form>({
    resolver: yupResolver<any>(schema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const { mutate, isLoading } = useResetPasswordApi();
  const onSubmit = async (data: Form) => {
    mutate(data, {
      onSuccess: (response: unknown) => {
        const res = response as ResetPasswordResponse;

        if (res?.status === StatusCode.SUCCESS) {
          enqueueSnackbar(i18n.t('auth.resetCodeEmailSent', { email: data.email }), {
            variant: 'success',
          });
          navigate(RoutePaths.confirmPassword, {
            state: {
              email: data.email,
              codeExpiration: res.data.data, // Передаем время истечения кода
            },
          });
        } else {
          let errorMessage = res?.detail || ValidationMessages.defaultError;
          // Обрабатываем сообщение об ошибке с преобразованием времени
          errorMessage = processErrorMessage(errorMessage);

          setError('email', {
            type: 'custom',
            message: errorMessage,
          });
        }
      },
      onError: (error: any) => {
        let errorMessage = error?.response?.data?.detail || ValidationMessages.defaultError;
        // Обрабатываем сообщение об ошибке с преобразованием времени
        errorMessage = processErrorMessage(errorMessage);

        setError('email', {
          type: 'custom',
          message: errorMessage,
        });
      },
    });
  };

  const errorUsername = email ? email.message : '';

  return {
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorUsername,
  };
};
