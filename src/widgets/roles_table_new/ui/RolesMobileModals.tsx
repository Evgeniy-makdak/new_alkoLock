import { FC } from 'react';

import { RoleAddChangeForm_new } from '@features/role_add_change_form_new';
import { RoleDeleteForm } from '@features/role_delete_form';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';

interface RolesMobileModalsProps {
  addRoleModalData: {
    changeRoleId: ID;
    closeAddRoleModal: () => void;
    openAddRoleModal: boolean;
  };
  deleteRoleModalData: {
    closeDeleteModal: () => void;
    deleteRole: { id: ID; text: any } | null;
    isOpen: boolean;
  };
}

export const RolesMobileModals: FC<RolesMobileModalsProps> = ({
  addRoleModalData,
  deleteRoleModalData,
}) => {
  return (
    <>
      <Popup
        body={
          <RoleAddChangeForm_new
            id={addRoleModalData.changeRoleId}
            closeModal={addRoleModalData.closeAddRoleModal}
          />
        }
        onCloseModal={addRoleModalData.closeAddRoleModal}
        isOpen={addRoleModalData.openAddRoleModal}
        toggleModal={addRoleModalData.closeAddRoleModal}
      />
      <Popup
        isOpen={deleteRoleModalData.isOpen}
        toggleModal={deleteRoleModalData.closeDeleteModal}
        body={
          <RoleDeleteForm
            role={deleteRoleModalData.deleteRole}
            closeModal={deleteRoleModalData.closeDeleteModal}
          />
        }
      />
    </>
  );
};
