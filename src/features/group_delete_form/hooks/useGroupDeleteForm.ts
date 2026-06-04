import { useState } from 'react';
import { enqueueSnackbar } from 'notistack';

import { SelectedBranchState } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';

import i18n from '../../../i18n';
import { useGroupDeleteFormApi } from '../api/useGroupDeleteFormApi';

export type GroupDeleteMode = 'plain' | 'transfer';

export const useGroupDeleteForm = (
  id: ID,
  close: () => void,
  setState: (data: { selectedBranchState?: SelectedBranchState }) => void,
  onGroupDeleted?: () => void,
) => {
  const { mutateAsync } = useGroupDeleteFormApi();
  const [activeDeleteMode, setActiveDeleteMode] = useState<GroupDeleteMode | null>(null);
  const isDeleting = activeDeleteMode !== null;

  const handleDelete = async (deactivateRecords: boolean) => {
    if (isDeleting) return;

    setActiveDeleteMode(deactivateRecords ? 'plain' : 'transfer');
    try {
      const response = await mutateAsync({ id, deactivateRecords });

      if (response?.status === 400) {
        const messageWithBreaks = response.detail.replace(/\n/g, '\n');
        enqueueSnackbar(messageWithBreaks, {
          variant: 'error',
          style: { whiteSpace: 'pre-line' },
        });
      } else {
        setState({ selectedBranchState: { id: 20, name: i18n.t('nav.mainBranch') } });
        onGroupDeleted?.();
      }
    } catch {
      enqueueSnackbar(i18n.t('errors.groupDeleteFailed'), { variant: 'error' });
    } finally {
      setActiveDeleteMode(null);
      close();
    }
  };

  return { handleDelete, isDeleting, activeDeleteMode };
};
