import { FC } from 'react';

import { GroupAddForm } from '@features/group_add_form';
import { GroupDeleteForm } from '@features/group_delete_form';
import { SelectedBranchState } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';

interface GroupsMobileModalsProps {
  addModalData: {
    changeBranch: any;
    closeAddBranchModal: () => void;
    openAddBranchModal: boolean;
  };
  deleteModalData: {
    handleCloseDeleteModal: () => void;
    selectBranchDelete: { id: ID; text: string } | null;
    isOpen: boolean;
  };
  setState: (data: { selectedBranchState?: SelectedBranchState }) => void;
}

export const GroupsMobileModals: FC<GroupsMobileModalsProps> = ({
  addModalData,
  deleteModalData,
  setState,
}) => {
  return (
    <>
      <Popup
        body={
          <GroupAddForm
            branch={addModalData.changeBranch}
            close={addModalData.closeAddBranchModal}
          />
        }
        onCloseModal={addModalData.closeAddBranchModal}
        isOpen={addModalData.openAddBranchModal}
        toggleModal={addModalData.closeAddBranchModal}
      />
      <Popup
        isOpen={deleteModalData.isOpen}
        toggleModal={deleteModalData.handleCloseDeleteModal}
        body={
          <GroupDeleteForm
            closeModal={deleteModalData.handleCloseDeleteModal}
            branch={deleteModalData.selectBranchDelete}
            setState={setState}
          />
        }
      />
    </>
  );
};
