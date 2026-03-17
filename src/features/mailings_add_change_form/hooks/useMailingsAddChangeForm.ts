/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable no-console */
import { createContext, useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import { EventsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID, IEmailSubscription, IEventType } from '@shared/types/BaseQueryTypes';

import { useMailingAddChangeFormApi } from '../api/useMailingAddChangeFormApi';
import { type Form, schema } from '../lib/validate';
import type { EventTypeWithIntervalsData } from '../ui/EventTypeWithIntervals';

interface CloseContextType {
  close: () => void;
}

const CloseContext = createContext<CloseContextType | null>(null);

export const useCloseContext = (): CloseContextType => {
  const context = useContext(CloseContext);
  if (!context) {
    throw new Error('useCloseContext must be used within a CloseContextProvider');
  }
  return context;
};

// Тип для данных рассылки
interface MailingDataItem {
  id?: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  email: string;
  branchId: number;
}

export const useMailingsAddChangeForm = (id: ID, close: () => void, onSuccess?: () => void) => {
  const { mailings, isLoading, changeMailing, createMailing, deleteMailing, email } =
    useMailingAddChangeFormApi(id);
  const [defaultValuesLoaded, setDefaultValuesLoaded] = useState(false);
  const [eventTypeOptions, setEventTypeOptions] = useState<IEventType[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [originalSubscriptions, setOriginalSubscriptions] = useState<IEmailSubscription[]>([]);
  const [originalEventTypesWithIntervals, setOriginalEventTypesWithIntervals] = useState<
    EventTypeWithIntervalsData[]
  >([]);
  const [eventTypesWithIntervals, setEventTypesWithIntervals] = useState<
    EventTypeWithIntervalsData[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [, setIsFormSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
    trigger,
    clearErrors,
    setError,
  } = useForm<Form>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
    },
    mode: 'onChange',
  });

  const errorName = errors.name?.message?.toString() || '';
  const currentValues = watch();

  // Автоматическая валидация при изменении email
  useEffect(() => {
    if (isDirty) {
      trigger('name');
    }
  }, [currentValues.name, isDirty, trigger]);

  // Автоматическая валидация при изменении типов событий и интервалов
  useEffect(() => {
    if (isDirty) {
      validateEventTypesAndIntervals();
    }
  }, [eventTypesWithIntervals, isDirty]);

  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        setIsLoadingEvents(true);
        const response = await EventsApi.getEventsTypeList(
          {
            filterOptions: {
              match: searchQuery || undefined,
            },
          },
          [16],
          false,
          false,
        );

        if (response?.data && Array.isArray(response.data)) {
          setEventTypeOptions(response.data);
        } else {
          setEventTypeOptions([]);
        }
      } catch (error) {
        setEventTypeOptions([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchEventTypes();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const sortTimeIntervals = (intervals: { startTime: string; endTime: string; id: string }[]) => {
    return [...intervals].sort((a, b) => {
      const timeA = a.startTime.replace(':', '');
      const timeB = b.startTime.replace(':', '');
      return timeA.localeCompare(timeB);
    });
  };

  // Функция для удаления дубликатов интервалов
  const removeDuplicateIntervals = (
    intervals: { startTime: string; endTime: string; id: string }[],
  ) => {
    const uniqueIntervals: { startTime: string; endTime: string; id: string }[] = [];
    const seen = new Set();

    intervals.forEach((interval) => {
      const key = `${interval.startTime}-${interval.endTime}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIntervals.push(interval);
      }
    });

    return uniqueIntervals;
  };

  const groupSubscriptionsByEventType = (
    subscriptions: IEmailSubscription[],
  ): EventTypeWithIntervalsData[] => {
    const grouped: { [key: string]: EventTypeWithIntervalsData } = {};

    subscriptions.forEach((subscription) => {
      const eventTypeLabel = subscription.eventType?.label;
      if (!eventTypeLabel) return;

      if (!grouped[eventTypeLabel]) {
        grouped[eventTypeLabel] = {
          id: `${eventTypeLabel}-${Date.now()}`,
          eventType: eventTypeLabel,
          timeIntervals: [],
        };
      }

      const formatTime = (time: string) => {
        if (!time) return '';
        return time.includes(':') ? time.split(':').slice(0, 2).join(':') : time;
      };

      grouped[eventTypeLabel].timeIntervals.push({
        id: subscription.id?.toString() || `temp-${Date.now()}`,
        startTime: formatTime(subscription.startTime),
        endTime: formatTime(subscription.endTime),
      });
    });

    Object.values(grouped).forEach((group) => {
      // Удаляем дубликаты интервалов перед сортировкой
      group.timeIntervals = removeDuplicateIntervals(group.timeIntervals);
      group.timeIntervals = sortTimeIntervals(group.timeIntervals);
    });

    return Object.values(grouped);
  };

  const sortEventTypesAlphabetically = (eventTypes: EventTypeWithIntervalsData[]) => {
    return [...eventTypes].sort((a, b) => a.eventType.localeCompare(b.eventType));
  };

  // ПРОСТАЯ И РАБОЧАЯ ПРОВЕРКА ИЗМЕНЕНИЙ
  const hasChanges = (): boolean => {
    if (!id) return true;

    // 1. Проверяем изменился ли email
    if (currentValues.name?.trim() !== email) {
      return true;
    }

    // 2. Простая проверка по количеству типов событий
    if (eventTypesWithIntervals.length !== originalEventTypesWithIntervals.length) {
      return true;
    }

    // 3. Простая проверка по JSON строке
    const currentData = JSON.stringify(
      eventTypesWithIntervals.map((et) => ({
        eventType: et.eventType,
        timeIntervals: et.timeIntervals.map((ti) => ({
          startTime: ti.startTime,
          endTime: ti.endTime,
        })),
      })),
    );

    const originalData = JSON.stringify(
      originalEventTypesWithIntervals.map((et) => ({
        eventType: et.eventType,
        timeIntervals: et.timeIntervals.map((ti) => ({
          startTime: ti.startTime,
          endTime: ti.endTime,
        })),
      })),
    );

    return currentData !== originalData;
  };

  const getEventTypeId = (eventName: string): number | undefined => {
    const eventType = eventTypeOptions.find((opt) => opt.label === eventName);
    return eventType?.id ? Number(eventType.id) : undefined;
  };

  // Функция для получения ID оригинальной подписки по данным интервала
  const getOriginalSubscriptionId = (intervalId: string): number | undefined => {
    const originalSubscription = originalSubscriptions.find(
      (sub) => sub.id?.toString() === intervalId,
    );
    return originalSubscription?.id ? Number(originalSubscription.id) : undefined;
  };

  useEffect(() => {
    if (
      !isLoading &&
      mailings &&
      mailings.length > 0 &&
      !defaultValuesLoaded &&
      eventTypeOptions.length > 0
    ) {
      setOriginalSubscriptions([...mailings]);

      const groupedEventTypes = groupSubscriptionsByEventType(mailings);
      const sortedEventTypes = sortEventTypesAlphabetically(groupedEventTypes);

      reset({
        name: email || '',
      });

      setEventTypesWithIntervals(sortedEventTypes);
      // Сохраняем оригинальное состояние для сравнения
      setOriginalEventTypesWithIntervals(JSON.parse(JSON.stringify(sortedEventTypes)));
      setDefaultValuesLoaded(true);
      setIsFormSaved(true);
    }

    if (!id && !defaultValuesLoaded) {
      reset({
        name: '',
      });
      setEventTypesWithIntervals([
        {
          id: 'default-1',
          eventType: '',
          timeIntervals: [],
        },
      ]);
      setOriginalSubscriptions([]);
      setOriginalEventTypesWithIntervals([]);
      setDefaultValuesLoaded(true);
      setIsFormSaved(false);
    }
  }, [mailings, isLoading, reset, defaultValuesLoaded, id, eventTypeOptions, email]);

  useEffect(() => {
    setDefaultValuesLoaded(false);
    setIsFormSaved(false);
  }, [id]);

  const validateEventTypesAndIntervals = (): boolean => {
    let isValid = true;

    // Очищаем предыдущие ошибки
    clearErrors('eventTypes');

    // Валидация наличия хотя бы одного типа события
    if (eventTypesWithIntervals.length === 0) {
      setError('eventTypes', {
        type: 'manual',
        message: 'Выберите хотя бы один тип события',
      });
      isValid = false;
    }

    // Валидация каждого типа события
    eventTypesWithIntervals.forEach((eventTypeData) => {
      // Валидация типа события
      if (!eventTypeData.eventType?.trim()) {
        isValid = false;
      }

      // Валидация интервалов времени
      if (eventTypeData.timeIntervals.length === 0) {
        isValid = false;
      } else {
        const hasEmptyIntervals = eventTypeData.timeIntervals.some(
          (interval) => !interval.startTime || !interval.endTime,
        );
        if (hasEmptyIntervals) {
          isValid = false;
        }
      }
    });

    return isValid;
  };

  const getValidationErrorsForEventType = (eventTypeId: string) => {
    if (!showValidationErrors) return {};

    const eventTypeData = eventTypesWithIntervals.find((et) => et.id === eventTypeId);
    if (!eventTypeData) return {};

    const errors: { eventType?: string; timeIntervals?: string } = {};

    // Валидация типа события
    if (!eventTypeData.eventType?.trim()) {
      errors.eventType = 'Выберите тип события';
    }

    // Валидация интервалов времени
    if (eventTypeData.timeIntervals.length === 0) {
      errors.timeIntervals = 'Добавьте хотя бы один интервал времени';
    } else {
      const hasEmptyIntervals = eventTypeData.timeIntervals.some(
        (interval) => !interval.startTime || !interval.endTime,
      );
      if (hasEmptyIntervals) {
        errors.timeIntervals = 'Заполните все интервалы времени';
      }
    }

    return errors;
  };

  const canAddMoreEventTypes = eventTypesWithIntervals.length < eventTypeOptions.length;

  const addEventType = () => {
    if (!canAddMoreEventTypes) return;

    const availableOptions = eventTypeOptions
      .map((opt) => opt.label)
      .filter((label) => !eventTypesWithIntervals.some((et) => et.eventType === label));

    if (availableOptions.length > 0) {
      const newEventTypes = [
        ...eventTypesWithIntervals,
        {
          id: `new-${Date.now()}`,
          eventType: '',
          timeIntervals: [],
        },
      ];
      setEventTypesWithIntervals(newEventTypes);
    }
  };

  const removeEventType = (id: string) => {
    const newEventTypes = eventTypesWithIntervals.filter((item) => item.id !== id);
    setEventTypesWithIntervals(newEventTypes);
  };

  const updateEventTypesWithIntervals = (newEventTypes: EventTypeWithIntervalsData[]) => {
    // Удаляем дубликаты интервалов в каждом типе события перед обновлением
    const eventTypesWithUniqueIntervals = newEventTypes.map((eventType) => ({
      ...eventType,
      timeIntervals: removeDuplicateIntervals(eventType.timeIntervals),
    }));

    const eventTypesWithSortedIntervals = eventTypesWithUniqueIntervals.map((eventType) => ({
      ...eventType,
      timeIntervals: sortTimeIntervals(eventType.timeIntervals),
    }));

    setEventTypesWithIntervals(eventTypesWithSortedIntervals);

    // Автоматическая валидация после изменения типов событий
    if (isDirty) {
      validateEventTypesAndIntervals();
    }
  };

  const onSubmit = async (data: Form) => {
    setShowValidationErrors(true);

    // Валидация email через react-hook-form
    const isEmailValid = await trigger('name');

    // Валидация типов событий и интервалов
    const isEventTypesValid = validateEventTypesAndIntervals();

    if (!isEmailValid || !isEventTypesValid) {
      return;
    }

    // ПРОВЕРЯЕМ ИЗМЕНЕНИЯ ПЕРЕД ОТПРАВКОЙ
    if (id && !hasChanges()) {
      close();
      return;
    }

    const currentBranchId = appStore.getState().selectedBranchState?.id;
    const branchIdNumber = Number(currentBranchId);

    if (!branchIdNumber || isNaN(branchIdNumber)) {
      return;
    }

    try {
      if (id) {
        // Логика для редактирования существующей рассылки
        const emailValue = data.name?.trim() || email || '';

        // 1. Удаляем подписки, которые были удалены пользователем
        const subscriptionsToDelete = originalSubscriptions.filter(
          (subscription) =>
            subscription.id &&
            !eventTypesWithIntervals.some((et) =>
              et.timeIntervals.some((interval) => interval.id === subscription.id?.toString()),
            ),
        );

        // Удаляем только если есть что удалять
        if (subscriptionsToDelete.length > 0) {
          for (const subscription of subscriptionsToDelete) {
            if (subscription.id) {
              try {
                await deleteMailing(Number(subscription.id));
              } catch (error) {
                console.error(`Ошибка при удалении подписки ${subscription.id}:`, error);
              }
            }
          }
        }

        // 2. Собираем ВСЕ подписки, которые должны остаться после редактирования
        // РАЗДЕЛЯЕМ НА ОБНОВЛЯЕМЫЕ И НОВЫЕ ПОДПИСКИ
        const updatedSubscriptionsData: MailingDataItem[] = [];
        const newSubscriptionsData: MailingDataItem[] = [];

        eventTypesWithIntervals.forEach((eventTypeData) => {
          const eventTypeId = getEventTypeId(eventTypeData.eventType);
          if (!eventTypeId) return;

          eventTypeData.timeIntervals.forEach((interval) => {
            const mailingData: MailingDataItem = {
              email: emailValue,
              eventTypeId: eventTypeId,
              startTime: `${interval.startTime}:00`,
              endTime: `${interval.endTime}:00`,
              branchId: branchIdNumber,
            };

            // Проверяем, является ли это обновлением существующей подписки
            const originalSubscriptionId = getOriginalSubscriptionId(interval.id);
            if (originalSubscriptionId) {
              // Это обновление существующей подписки - добавляем ID
              mailingData.id = originalSubscriptionId;
              updatedSubscriptionsData.push(mailingData);
            } else {
              newSubscriptionsData.push(mailingData);
            }
          });
        });

        // 3. Отправляем PUT запрос с ВСЕМИ подписками, которые должны остаться
        const allSubscriptionsData = [...updatedSubscriptionsData, ...newSubscriptionsData];

        if (allSubscriptionsData.length > 0) {
          try {
            await changeMailing({
              email: emailValue,
              //@ts-expect-error: временное решение
              data: allSubscriptionsData,
            });
          } catch (error) {
            console.error('Ошибка при обновлении рассылки:', error);
            enqueueSnackbar({
              message: 'Произошла ошибка при обновлении рассылки',
              variant: 'error',
            });
            return;
          }
        }
      } else {
        // Логика для создания новой рассылки - используем POST запрос
        const allSubscriptionsData: MailingDataItem[] = [];

        eventTypesWithIntervals.forEach((eventTypeData) => {
          const eventTypeId = getEventTypeId(eventTypeData.eventType);
          if (!eventTypeId) return;

          eventTypeData.timeIntervals.forEach((interval) => {
            const mailingData: MailingDataItem = {
              email: data.name?.trim() || email || '',
              eventTypeId: eventTypeId,
              startTime: `${interval.startTime}:00`,
              endTime: `${interval.endTime}:00`,
              branchId: branchIdNumber,
            };

            allSubscriptionsData.push(mailingData);
          });
        });

        const response = await createMailing(allSubscriptionsData);

        if (response?.status === 404 && response?.detail) {
          enqueueSnackbar({ message: response.detail, variant: 'error' });
          return;
        }
      }

      setIsFormSaved(true);
      onSuccess?.();
      close();
    } catch (error) {
      console.error('Ошибка при сохранении рассылки:', error);
      enqueueSnackbar({ message: 'Произошла ошибка при сохранении рассылки', variant: 'error' });
    }
  };

  const eventTypeLabels = eventTypeOptions.map((opt) => opt.label);

  return {
    errorName,
    register,
    handleSubmit: handleSubmit(onSubmit),
    isLoading: isLoading || isLoadingEvents,
    eventTypesWithIntervals,
    setEventTypesWithIntervals: updateEventTypesWithIntervals,
    eventTypeOptions: eventTypeLabels,
    isEditMode: !!id,
    addEventType,
    removeEventType,
    canAddMoreEventTypes,
    setSearchQuery,
    validationErrors: {
      eventTypes: errors.eventTypes?.message,
      getEventTypeErrors: getValidationErrorsForEventType,
    },
  };
};
