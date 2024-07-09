import { useForm } from 'react-hook-form';

import { enqueueSnackbar } from 'notistack';

import { AttachmentsApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useCreateAttachment } from '../api/createAttachment';

interface AttachmentAddForm {
  carId: Values;
  driverId: Values;
}

export const useAttachmentsForm = (closeModal: () => void) => {
  const { register, setValue, getValues, setError, clearErrors, watch, formState } =
    useForm<AttachmentAddForm>({
      defaultValues: {
        carId: [],
        driverId: [],
      },
    });

  const mutation = useCreateAttachment();
  const onSelect = (type: keyof AttachmentAddForm, value: string | Value | (string | Value)[]) => {
    const values = ArrayUtils.getArrayValues(value);
    clearErrors(['driverId', 'carId']);
    setValue(type, values);
  };

  const onAddAtachment = async () => {
    const driverId = getValues('driverId')[0]?.value;
    const vehicleId = getValues('carId')[0]?.value;

    if (!driverId || !vehicleId) {
      !driverId && setError('driverId', {});
      !vehicleId && setError('carId', {});
      enqueueSnackbar('Произошла ошибка при добавлении вложения', { variant: 'error' });
    } else {
      const data = { driverId, vehicleId };
      const response = await AttachmentsApi.createItem(data);
      if (response.status === StatusCode.BAD_REQUEST) {
        enqueueSnackbar(response.detail, { variant: 'error' });
      } else {
        mutation(data);
        closeModal();
      }
    }
  };

  return {
    driverId: watch('driverId'),
    carId: watch('carId'),
    onSelect,
    register,
    onAddAtachment,
    errorDriver: formState.errors?.driverId ? true : false,
    errorCar: formState.errors?.carId ? true : false,
  };
};
