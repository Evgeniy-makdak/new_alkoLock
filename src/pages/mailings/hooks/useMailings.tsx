import { useState } from 'react';

import { type ID } from '@shared/types/BaseQueryTypes';
import { useMailingsTable } from '@widgets/mailings_table/hooks/useMailingsTable';

export const useMailings = () => {
  const [selectedMailingId, setSelectedMailingId] = useState<ID | null>(null);

  const onClickRow = (id: ID) => {
    setSelectedMailingId(id);
  };

  const handleCloseAside = () => {
    setSelectedMailingId(null);
  };

  const {
    addModalData,
    deleteMailingModalData,
    recoverMailingModalData,
    trueDeleteMailingModalData,
  } = useMailingsTable();

  return {
    onClickRow,
    selectedMailingId,
    handleCloseAside,
    addModalData,
    deleteMailingModalData,
    recoverMailingModalData,
    trueDeleteMailingModalData,
  };
};
