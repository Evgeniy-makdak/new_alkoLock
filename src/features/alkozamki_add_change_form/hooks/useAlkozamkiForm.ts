/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';
import { Formatters } from '@shared/utils/formatters';

import { useAlkozamkiFormApi } from '../api/useAlkozamkiFormApi';
import { type Form, schema } from '../lib/validate';

const ALKOZAMKI_ADD_DEFAULTS: Form = {
  name: '',
  serialNumber: '',
  tc: [],
};

export const useAlkozamkiForm = (id?: ID, closeModal?: () => void) => {
  const selectedBranch = appStore.getState().selectedBranchState;
  const { alkolock, isLoadingAlkolock, changeItem, createItem, getAttachmentsByVehicle } =
    useAlkozamkiFormApi(id);
  const car = alkolock?.vehicleBind?.vehicle;

  const [showDriversTransferModal, setShowDriversTransferModal] = useState(false);
  const [driversForTransfer, setDriversForTransfer] = useState<any[]>([]);
  const [pendingFormData, setPendingFormData] = useState<Form | null>(null);
  const [newVehicleId, setNewVehicleId] = useState<ID | null>(null);
  const [originalVehicleId, setOriginalVehicleId] = useState<ID | null>(null);
  const [newVehicleData, setNewVehicleData] = useState<{
    id: ID;
    registrationNumber: string;
    manufacturer: string;
    model: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editingDefaults = useMemo((): Form | null => {
    if (!id || !alkolock || isLoadingAlkolock) return null;
    const v = alkolock.vehicleBind?.vehicle;
    return {
      name: alkolock.name || '',
      serialNumber: String(alkolock.serialNumber ?? ''),
      tc: v ? [{ label: Formatters.carNameFormatter(v), value: v.id }] : [],
    };
  }, [id, isLoadingAlkolock, alkolock?.id]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: {
      errors: { name: nameAlkolock, serialNumber },
      isDirty,
      // errors: { name: nameAlkolock, serialNumber, uid },
    },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: ALKOZAMKI_ADD_DEFAULTS,
  });

  useEffect(() => {
    if (!id) {
      reset(ALKOZAMKI_ADD_DEFAULTS, { keepDirty: false });
      return;
    }
    if (editingDefaults) {
      reset(editingDefaults, { keepDirty: false });
    }
  }, [id, editingDefaults, reset]);

  const customReset = () => {
    if (!car?.id) return;
    setValue(
      'tc',
      [
        {
          label: Formatters.carNameFormatter(car),
          value: car.id,
        },
      ] as never,
      { shouldDirty: false },
    );
  };

  const onSelect = (type: keyof Form, value: string | Value | (string | Value)[]) => {
    const values = ArrayUtils.getArrayValues(value);
    setValue(type, values, { shouldDirty: true });
  };

  const errorName = nameAlkolock ? nameAlkolock.message.toString() : '';
  const errorSerialNumber = serialNumber ? serialNumber.message.toString() : '';
  // const errorUid = uid ? uid.message.toString() : '';

  const handleSaveWithDriverTransfer = async (driverIds: ID[]) => {
    if (!pendingFormData || !newVehicleId) return;

    setIsSubmitting(true);

    try {
      // Создаем привязки только для выбранных водителей
      if (driverIds.length > 0) {
        // Собираем информацию о водителях для отображения успеха
        const driverInfoMap = new Map();
        driversForTransfer.forEach((driver) => {
          driverInfoMap.set(driver.driver.id, {
            fullName: Formatters.nameFormatter(driver.driver.userAccount),
            licenseCode: driver.driver.licenseCode,
          });
        });

        const successfulDrivers: Array<{ fullName: string; licenseCode: string }> = [];

        // Создаем привязки для выбранных водителей
        for (const driverId of driverIds) {
          try {
            await getAttachmentsByVehicle.createAttachment({
              driverId,
              vehicleId: newVehicleId,
            });
            const driverInfo = driverInfoMap.get(driverId);
            if (driverInfo) {
              successfulDrivers.push(driverInfo);
            }
          } catch (error: any) {
            // Обрабатываем ошибку 400 - привязка уже существует
            // Теперь эта ошибка не должна возникать, так как мы фильтруем водителей
            if (error?.response?.status === 400) {
              console.warn(`Привязка для водителя ${driverId} уже существует`);
            } else {
              // Пробрасываем другие ошибки
              throw error;
            }
          }
        }

        // Если есть успешные привязки, показываем уведомление об успехе
        if (successfulDrivers.length > 0) {
          enqueueSnackbar(`Успешно создано привязок: ${successfulDrivers.length}`, {
            variant: 'success',
            hideIconVariant: true,
          });
        }
      }

      // Отправляем основную форму (перенос алкозамка)
      await submitFormData(pendingFormData);

      if (closeModal) {
        closeModal();
      }
    } catch (error) {
      // Обработка других ошибок в хуке
      console.error('Error in handleSaveWithDriverTransfer:', error);
    } finally {
      setIsSubmitting(false);
      setShowDriversTransferModal(false);
      setPendingFormData(null);
      setNewVehicleId(null);
      setOriginalVehicleId(null);
      setNewVehicleData(null);
    }
  };

  const submitFormData = async (data: Form) => {
    // 🔧 FIX: Убираем обрезку данных здесь - она должна происходить в валидации
    // const trimmedData = Object.keys(data).reduce((acc, key) => {
    //   const value = data[key as keyof Form];
    //   acc[key as keyof Form] = typeof value === 'string' ? value.trim() : (value as any);
    //   return acc;
    // }, {} as Form);

    // 🔧 FIX: Используем исходные данные без обрезки
    const car = data?.tc?.length ? data?.tc[0]?.value : '';
    const payload = {
      branchId: 'id' in selectedBranch ? selectedBranch.id : 10,
      name: data.name,
      serialNumber: data.serialNumber,
      // serviceId: data.uid,
      vehicleId: car,
    };

    if (id) {
      await changeItem(payload);
    } else {
      await createItem(payload);
    }
  };

  const onSubmit = async (data: Form) => {
    const currentVehicle = data?.tc?.length ? data.tc[0]?.value : null;
    const originalVehicle = car?.id;

    // Если редактируем существующий алкозамок и ТС изменилось
    if (id && originalVehicle && currentVehicle && originalVehicle !== currentVehicle) {
      // Получаем данные о новом ТС из выбранного значения
      const newVehicle = data?.tc?.length ? data.tc[0] : null;

      if (newVehicle && typeof newVehicle === 'object' && 'label' in newVehicle) {
        // Парсим данные из label (формат: "Марка Модель (Номер)")
        const label = newVehicle.label as string;
        const match = label.match(/^(.+?) (.+?) \((.+?)\)$/);

        if (match) {
          const [, manufacturer, model, registrationNumber] = match;
          setNewVehicleData({
            id: currentVehicle,
            manufacturer: manufacturer.trim(),
            model: model.trim(),
            registrationNumber: registrationNumber.trim(),
          });
        }
      }

      // Получаем привязки водителей к исходному ТС с branchId
      const attachments = await getAttachmentsByVehicle.fetch(
        originalVehicle,
        'id' in selectedBranch ? selectedBranch.id : undefined,
      );

      // Фильтруем привязки, оставляем только те, где vehicle.id соответствует исходному ТС
      const filteredAttachments = attachments.filter(
        (attachment) => attachment.vehicle?.id === originalVehicle,
      );

      // Получаем привязки водителей к новому ТС для фильтрации
      const newVehicleAttachments = await getAttachmentsByVehicle.fetch(
        currentVehicle,
        'id' in selectedBranch ? selectedBranch.id : undefined,
      );

      // Создаем Set из ID водителей, которые уже привязаны к новому ТС
      const driversAlreadyAttachedToNewVehicle = new Set(
        newVehicleAttachments
          .filter((attachment) => attachment.vehicle?.id === currentVehicle)
          .map((attachment) => attachment.driver.id),
      );

      // Фильтруем водителей: оставляем только тех, кто еще не привязан к новому ТС
      const driversWithoutAttachmentToNewVehicle = filteredAttachments.filter(
        (attachment) => !driversAlreadyAttachedToNewVehicle.has(attachment.driver.id),
      );

      // Если есть водители для переноса - показываем модальное окно
      if (driversWithoutAttachmentToNewVehicle && driversWithoutAttachmentToNewVehicle.length > 0) {
        // Сохраняем данные формы для последующей отправки
        setPendingFormData(data);
        setNewVehicleId(currentVehicle);
        setOriginalVehicleId(originalVehicle);
        setDriversForTransfer(driversWithoutAttachmentToNewVehicle);
        setShowDriversTransferModal(true);
        return;
      }
      // Если нет водителей для переноса - сразу отправляем форму
      else {
        setIsSubmitting(true);
        try {
          await submitFormData(data);
          if (closeModal) {
            closeModal();
          }
        } catch (error) {
          // Обработка ошибок в хуке
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
    }

    // Если не нужно переносить водителей, просто отправляем форму
    setIsSubmitting(true);
    try {
      await submitFormData(data);
      if (closeModal) {
        closeModal();
      }
    } catch (error) {
      // Обработка ошибок в хуке
    } finally {
      setIsSubmitting(false);
    }
  };

  /** При редактировании: ТС, привязанное к алкозамку с бэка — всегда в списке выбора (после сброса крестиком). */
  const alwaysIncludeVehicleOptions: { label: string; value: ID }[] | undefined =
    id && car
      ? [
          {
            label: Formatters.carNameFormatter(car),
            value: car.id,
          },
        ]
      : undefined;

  return {
    alwaysIncludeVehicleOptions,
    reset: customReset,
    errorName,
    errorSerialNumber,
    // errorUid,
    nameAlkolock,
    serialNumber,
    // uid,
    register,
    handleSubmit: handleSubmit(onSubmit),
    onSelect,
    tc: watch('tc'),
    isLoadingAlkolock,
    showDriversTransferModal,
    setShowDriversTransferModal,
    driversForTransfer,
    handleSaveWithDriverTransfer,
    newVehicleId,
    originalVehicleId,
    newVehicleData,
    isSubmitting,
    isDirty,
  };
};
