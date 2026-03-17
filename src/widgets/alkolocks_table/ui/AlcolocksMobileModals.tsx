import { FC } from 'react';

import { AlkolockDeleteForm } from '@features/alkolock_delete_form';
import { AlkolockTrueDeleteForm } from '@features/alkolock_true_delete_form/ui/AlkolockTrueDeleteForm';
import { AlkozamkiForm } from '@features/alkozamki_add_change_form';
import { RecoverAlcolockForm } from '@features/recover_alkolock_form';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';

interface AlcolocksMobileModalsProps {
  addAlcolockModalData: {
    changeAlcolockId: ID;
    closeAddAlcolockModal: () => void;
    openAddAlcolockModal: boolean;
  };
  deleteAlcolockModalData: {
    closeDeleteModal: () => void;
    deleteAlcolock: { id: ID; text: any } | null;
    isOpen: boolean;
  };
  recoverAlcolockModalData: {
    closeRecoverModal: () => void;
    recoverAlkolock: { id: ID; text: any } | null;
    isOpen: boolean;
    closeAside: () => void;
  };
  deleteTrueAlcolockModalData: {
    closeTrueDeleteModal: () => void;
    trueDeleteAlcolock: { id: ID; text: any } | null;
    isOpen: boolean;
  };
}

export const AlcolocksMobileModals: FC<AlcolocksMobileModalsProps> = ({
  addAlcolockModalData,
  deleteAlcolockModalData,
  recoverAlcolockModalData,
  deleteTrueAlcolockModalData,
}) => {
  return (
    <>
      <Popup
        body={
          <AlkozamkiForm
            id={addAlcolockModalData.changeAlcolockId}
            closeModal={addAlcolockModalData.closeAddAlcolockModal}
          />
        }
        onCloseModal={addAlcolockModalData.closeAddAlcolockModal}
        isOpen={addAlcolockModalData.openAddAlcolockModal}
        toggleModal={addAlcolockModalData.closeAddAlcolockModal}
      />
      <Popup
        isOpen={deleteAlcolockModalData.isOpen}
        toggleModal={deleteAlcolockModalData.closeDeleteModal}
        body={
          <AlkolockDeleteForm
            closeDeleteModal={deleteAlcolockModalData.closeDeleteModal}
            alkolock={deleteAlcolockModalData.deleteAlcolock}
          />
        }
      />
      <Popup
        body={
          <RecoverAlcolockForm
            alcolock={recoverAlcolockModalData.recoverAlkolock}
            closeModal={recoverAlcolockModalData.closeRecoverModal}
            closeAside={recoverAlcolockModalData.closeAside}
          />
        }
        onCloseModal={recoverAlcolockModalData.closeRecoverModal}
        isOpen={recoverAlcolockModalData.isOpen}
        toggleModal={recoverAlcolockModalData.closeRecoverModal}
      />
      <Popup
        isOpen={deleteTrueAlcolockModalData.isOpen}
        toggleModal={deleteTrueAlcolockModalData.closeTrueDeleteModal}
        body={
          <AlkolockTrueDeleteForm
            closeTrueDeleteModal={deleteTrueAlcolockModalData.closeTrueDeleteModal}
            alkolock={deleteTrueAlcolockModalData.trueDeleteAlcolock}
          />
        }
      />
    </>
  );
};
