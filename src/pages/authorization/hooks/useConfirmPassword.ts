/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import { useConfirmPasswordApi } from '@pages/authorization/api/useConfirmPasswordApi';
import { UsersApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';

import i18n from '../../../i18n';
import { Form, schema } from '../lib/validateConfirm';

export const useConfirmPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const initialExpiration = location.state?.codeExpiration;

  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [codeExpiration, setCodeExpiration] = useState<string | null>(initialExpiration || null);

  // Таймер для активации кнопки "Отправить код повторно"
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsResendDisabled(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: {
      errors: { verificationCode },
    },
  } = useForm<Form>({
    resolver: yupResolver<any>(schema),
    defaultValues: { email },
  });

  const { mutate, isLoading } = useConfirmPasswordApi();

  const handleResendCode = async () => {
    if (!email) {
      enqueueSnackbar(i18n.t('auth.emailNotDetermined'), { variant: 'error' });
      return;
    }

    try {
      const response = await UsersApi.resetPassword({ email });
      enqueueSnackbar(i18n.t('auth.codeResent'), { variant: 'success' });

      // Обновляем время истечения кода из ответа сервера
      // @ts-expect-error: временное решение
      setCodeExpiration(response.data.data);
      setIsResendDisabled(true);
      setSecondsLeft(60);

      // Перезапускаем таймер активации кнопки
      const timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsResendDisabled(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      enqueueSnackbar(i18n.t('auth.resendFailed'), { variant: 'error' });
    }
  };

  const onSubmit = async (data: Form) => {
    if (!email) {
      enqueueSnackbar(i18n.t('auth.emailNotDetermined'), { variant: 'error' });
      return;
    }

    const cleanedVerificationCode = data.verificationCode.trim().replace(/\s/g, '');

    // Функция для преобразования русской GMT даты в локальное время
    const convertGMTToLocal = (message: string): string => {
      const months = {
        'янв.': 'Jan',
        'фев.': 'Feb',
        'мар.': 'Mar',
        'апр.': 'Apr',
        'мая.': 'May',
        'июн.': 'Jun',
        'июл.': 'Jul',
        'авг.': 'Aug',
        'сен.': 'Sep',
        'окт.': 'Oct',
        'ноя.': 'Nov',
        'дек.': 'Dec',
      };

      try {
        // Ищем дату в формате "16 июн. 2025 г., 08:18:04"
        const dateMatch = message.match(/(\d{1,2}) ([а-яё]+\.) (\d{4}) г\., (\d{2}:\d{2}:\d{2})/);
        if (!dateMatch) return message;

        const [dateStr] = dateMatch;
        const [day, monthRus, year, , time] = dateStr.split(/[ ,]+/);
        const monthEng = months[monthRus as keyof typeof months];
        if (!monthEng) return message;

        // Создаем строку в формате "Jun 16 2025 08:18:04 GMT"
        const gmtDateStr = `${monthEng} ${day} ${year} ${time} GMT`;
        const date = new Date(gmtDateStr);
        if (isNaN(date.getTime())) return message;

        // Форматируем в локальное время с русскими названиями месяцев
        const formatter = new Intl.DateTimeFormat('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const localDateStr = formatter.format(date);
        return message.replace(dateMatch[0], localDateStr);
      } catch (e) {
        console.error('Ошибка преобразования даты:', e);
        return message;
      }
    };

    const extractLockUntilLocal = (message: string): string | null => {
      const months = {
        'янв.': 'Jan',
        'фев.': 'Feb',
        'мар.': 'Mar',
        'апр.': 'Apr',
        'мая.': 'May',
        'июн.': 'Jun',
        'июл.': 'Jul',
        'авг.': 'Aug',
        'сен.': 'Sep',
        'окт.': 'Oct',
        'ноя.': 'Nov',
        'дек.': 'Dec',
      };

      try {
        const dateMatch = message.match(/(\d{1,2}) ([а-яё]+\.) (\d{4}) г\., (\d{2}:\d{2}:\d{2})/i);
        if (!dateMatch) return null;
        const [dateStr] = dateMatch;
        const [day, monthRus, year, , time] = dateStr.split(/[ ,]+/);
        const monthEng = months[monthRus.toLowerCase() as keyof typeof months];
        if (!monthEng) return null;
        const date = new Date(`${monthEng} ${day} ${year} ${time} GMT`);
        if (isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat(i18n.language || 'ru', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(date);
      } catch {
        return null;
      }
    };

    const localizeVerificationError = (rawMessage: string): string => {
      const localizedMessage = convertGMTToLocal(rawMessage);
      const rawLower = String(rawMessage || '').toLowerCase();
      const localizedLower = String(localizedMessage || '').toLowerCase();
      const isAttemptsExceeded =
        rawLower.includes('превышено количество попыток') ||
        rawLower.includes('too many attempts') ||
        rawLower.includes('attempt limit exceeded') ||
        localizedLower.includes('превышено количество попыток') ||
        localizedLower.includes('too many attempts') ||
        localizedLower.includes('attempt limit exceeded');
      if (!isAttemptsExceeded) return localizedMessage;

      const until = extractLockUntilLocal(rawMessage) ?? extractLockUntilLocal(localizedMessage);
      return i18n.t('auth.confirmCodeAttemptsExceeded', { until: until || '—' });
    };

    mutate(
      {
        email,
        verificationCode: cleanedVerificationCode,
      },
      {
        //@ts-expect-error: временное решение
        onSuccess: (response: {
          status: StatusCode;
          detail: string;
          data: { message: string };
        }) => {
          if (response?.status === StatusCode.SUCCESS) {
            enqueueSnackbar(i18n.t('auth.codeConfirmed'), { variant: 'success' });
            navigate(RoutePaths.forgetPassword, {
              state: { email: email },
            });
          } else {
            const errorMessage = response?.detail || ValidationMessages.defaultError;
            const localizedMessage = localizeVerificationError(errorMessage);

            setError('verificationCode', {
              type: 'custom',
              message: localizedMessage,
            });
          }
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.detail || ValidationMessages.defaultError;
          const localizedMessage = localizeVerificationError(errorMessage);

          setError('verificationCode', {
            type: 'custom',
            message: localizedMessage,
          });
        },
      },
    );
  };

  return {
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorVerificationCode: verificationCode?.message || '',
    control,
    handleResendCode,
    isResendDisabled,
    secondsLeft,
    codeExpiration, // Добавляем codeExpiration в возвращаемые значения
  };
};
