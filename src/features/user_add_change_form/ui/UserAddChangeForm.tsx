/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC } from 'react';

import { useMediaQuery } from '@mui/material';

import { UserAddChangeDesktopForm } from './UserAddChangeDesktopForm';
import { UserAddChangeMobileForm } from './UserAddChangeMobileForm';

type UserAddChangeFormProps = {
  closeModal: () => void;
  id?: string | number;
};

export const UserAddChangeForm: FC<UserAddChangeFormProps> = ({ closeModal, id }) => {
  const isMobile = useMediaQuery('(max-width:768px)');

  if (isMobile) {
    return <UserAddChangeMobileForm closeModal={closeModal} id={id} />;
  }

  return <UserAddChangeDesktopForm closeModal={closeModal} id={id} />;
};
