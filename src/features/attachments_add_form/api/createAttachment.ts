import { enqueueSnackbar } from 'notistack';

import { AttachmentsApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { AttachmentsCreateData } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQuerys = [QueryKeys.ATTACHMENT_LIST];

export const useCreateAttachment = () => {
  const updateQuerysFn = useUpdateQueries();

  const { mutate } = useMutation({
    mutationFn: async (data: AttachmentsCreateData) => {
      const response = await AttachmentsApi.createItem(data);

      if (response?.isError || response?.status === StatusCode.BAD_REQUEST) {
        const errorDetail = response?.detail;
        return Promise.reject({ isHandled: true, errorDetail });
      }

      return response;
    },
    onSuccess: () => {
      updateQuerysFn(updateQuerys);
    },
    onError: (error: any) => {
      if (error?.isHandled) {
        enqueueSnackbar(error.errorDetail, { variant: 'error' });
      } else {
        //
      }
    },
  });

  return mutate;
};
