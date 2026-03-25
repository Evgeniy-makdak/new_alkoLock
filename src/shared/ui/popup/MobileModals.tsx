import { FC, useEffect, useMemo } from 'react';

import { useTheme } from '@mui/material/styles';

import { CarAddMobileChangeForm } from '@features/car_add_change_form/ui/CarAddMobileChangeForm';
import { DeleteCarForm } from '@features/delete_car_form';
import { DeleteTrueCarForm } from '@features/delete_true_car_form/ui/DeleteTrueCarForm';
import { DeleteUserForm } from '@features/delete_user_form';
import { RecoverCarForm } from '@features/recover_car_form/ui';
import { RecoverUserForm } from '@features/recover_user_form/ui';
import { TrueDeleteUserForm } from '@features/true_delete_user_form';
import { UserAddChangeForm } from '@features/user_add_change_form';
import { RoleChipStyles } from '@widgets/users_table/ui/RoleChipStyles';

import styles from './MobileModals.module.scss';

interface MobileModalsProps {
  addModalData?: {
    changeUserId: any;
    closeAddUserModal: () => void;
    openAddUserModal: boolean;
  };
  deleteUserModalData?: {
    closeDeleteModal: () => void;
    deleteUser: any;
    isOpen: boolean;
    closeAside: () => void;
  };
  recoverUserModalData?: {
    closeRecoverModal: () => void;
    recoverUser: any;
    isOpen: boolean;
    closeAside: () => void;
  };
  trueDeleteUserModalData?: {
    closeTrueDeleteModal: () => void;
    trueDeleteUser: any;
    isOpen: boolean;
    closeAside: () => void;
  };
  addCarModalData?: {
    changeCarId: any;
    closeAddCarModal: () => void;
    openAddCarModal: boolean;
  };
  deleteCarModalData?: {
    closeDeleteModal: () => void;
    deleteCar: any;
    isOpen: boolean;
  };
  recoverCarModalData?: {
    closeRecoverModal: () => void;
    recoverCar: any;
    isOpen: boolean;
    closeAside: () => void;
  };
  deleteTrueCarModalData?: {
    closeTrueDeleteModal: () => void;
    trueDeleteCar: any;
    isOpen: boolean;
  };
}

export const MobileModals: FC<MobileModalsProps> = ({
  addModalData,
  deleteUserModalData,
  recoverUserModalData,
  trueDeleteUserModalData,
  addCarModalData,
  deleteCarModalData,
  recoverCarModalData,
  deleteTrueCarModalData,
}) => {
  const theme = useTheme();
  const modalPaperStyle = useMemo(
    () => ({
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    }),
    [theme],
  );

  const isAnyUserModalOpen =
    addModalData?.openAddUserModal ||
    false ||
    deleteUserModalData?.isOpen ||
    false ||
    recoverUserModalData?.isOpen ||
    false ||
    trueDeleteUserModalData?.isOpen ||
    false;

  const isAnyCarModalOpen =
    addCarModalData?.openAddCarModal ||
    false ||
    deleteCarModalData?.isOpen ||
    false ||
    recoverCarModalData?.isOpen ||
    false ||
    deleteTrueCarModalData?.isOpen ||
    false;

  const isAnyModalOpen = isAnyUserModalOpen || isAnyCarModalOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  const renderAddUserModal = () => {
    if (!addModalData?.openAddUserModal) return null;

    return (
      <div className={styles.mobileModalOverlay}>
        <RoleChipStyles />
        <div className={styles.mobileModalContent} style={modalPaperStyle}>
          <UserAddChangeForm
            id={addModalData.changeUserId}
            closeModal={addModalData.closeAddUserModal}
          />
        </div>
      </div>
    );
  };

  const renderDeleteUserModal = () => {
    if (!deleteUserModalData?.isOpen || !deleteUserModalData.deleteUser) return null;

    return (
      <div className={styles.mobileModalOverlay}>
        <RoleChipStyles />
        <div className={styles.mobileModalContent} style={modalPaperStyle}>
          <DeleteUserForm
            user={deleteUserModalData.deleteUser}
            closeModal={deleteUserModalData.closeDeleteModal}
            closeAside={deleteUserModalData.closeAside}
          />
        </div>
      </div>
    );
  };

  const renderRecoverUserModal = () => {
    if (!recoverUserModalData?.isOpen || !recoverUserModalData.recoverUser) return null;

    return (
      <div className={styles.mobileModalOverlay}>
        <RoleChipStyles />
        <div className={styles.mobileModalContent} style={modalPaperStyle}>
          <RecoverUserForm
            user={recoverUserModalData.recoverUser}
            closeModal={recoverUserModalData.closeRecoverModal}
            closeAside={recoverUserModalData.closeAside}
          />
        </div>
      </div>
    );
  };

  const renderTrueDeleteUserModal = () => {
    if (!trueDeleteUserModalData?.isOpen || !trueDeleteUserModalData.trueDeleteUser) return null;

    return (
      <div className={styles.mobileModalOverlay}>
        <RoleChipStyles />
        <div className={styles.mobileModalContent} style={modalPaperStyle}>
          <TrueDeleteUserForm
            user={trueDeleteUserModalData.trueDeleteUser}
            closeModal={trueDeleteUserModalData.closeTrueDeleteModal}
            closeAside={trueDeleteUserModalData.closeAside}
          />
        </div>
      </div>
    );
  };

  const renderAddCarModal = () => {
    if (!addCarModalData?.openAddCarModal) return null;

    return (
      <div className={styles.mobileModalOverlay}>
        <div className={styles.mobileModalContent} style={modalPaperStyle}>
          <CarAddMobileChangeForm
            id={addCarModalData.changeCarId}
            closeModal={addCarModalData.closeAddCarModal}
          />
        </div>
      </div>
    );
  };

  const renderDeleteCarModal = () => {
    if (!deleteCarModalData?.isOpen || !deleteCarModalData.deleteCar) return null;

    return (
      <div className={styles.mobileModalOverlay}>
        <div className={styles.mobileModalContent} style={modalPaperStyle}>
          <DeleteCarForm
            car={deleteCarModalData.deleteCar}
            closeModal={deleteCarModalData.closeDeleteModal}
          />
        </div>
      </div>
    );
  };

  const renderRecoverCarModal = () => {
    if (!recoverCarModalData?.isOpen || !recoverCarModalData.recoverCar) return null;

    return (
      <div className={styles.mobileModalOverlay}>
        <div className={styles.mobileModalContent} style={modalPaperStyle}>
          <RecoverCarForm
            car={recoverCarModalData.recoverCar}
            closeModal={recoverCarModalData.closeRecoverModal}
            closeAside={recoverCarModalData.closeAside}
          />
        </div>
      </div>
    );
  };

  const renderTrueDeleteCarModal = () => {
    if (!deleteTrueCarModalData?.isOpen || !deleteTrueCarModalData.trueDeleteCar) return null;

    return (
      <div className={styles.mobileModalOverlay}>
        <div className={styles.mobileModalContent} style={modalPaperStyle}>
          <DeleteTrueCarForm
            car={deleteTrueCarModalData.trueDeleteCar}
            closeModal={deleteTrueCarModalData.closeTrueDeleteModal}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {renderAddUserModal()}
      {renderDeleteUserModal()}
      {renderRecoverUserModal()}
      {renderTrueDeleteUserModal()}

      {renderAddCarModal()}
      {renderDeleteCarModal()}
      {renderRecoverCarModal()}
      {renderTrueDeleteCarModal()}
    </>
  );
};
