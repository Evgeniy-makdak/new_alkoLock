import { type FC } from 'react';

import { Stack } from '@mui/material';

import { UploadImg } from '@entities/upload_img';
import { Permissions } from '@shared/config/permissionsEnums';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useUserAddFoto } from '../hooks/useUserAddFoto';
import style from './UserAddFoto.module.scss';

type UserAddFoto = {
  userId: ID;
  userActive: boolean;
};

export const UserAddFoto: FC<UserAddFoto> = ({ userId, userActive }) => {
  const { setUploadImage, lengthMoreZero, uploadImage, onSubmit, isLoading } =
    useUserAddFoto(userId);

  const permissions = appStore((state) => state.permissions);
  const isGlobalAdmin = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
  const isEdit = permissions.includes(Permissions.PERMISSION_USER_EDIT);
  const isDisabled = () => {
    if (!userActive || !isEdit) return true;
    return userId === 1 ? !isGlobalAdmin : false;
  };

  return (
    <Stack direction={'column'} maxWidth={'570px'}>
      <UploadImg
        labelStyle={style.labelStyle}
        multiple
        images={uploadImage}
        setImage={setUploadImage}
        disabled={isDisabled()}
      />

      {lengthMoreZero && (
        <Button isLoading={isLoading} onClick={onSubmit}>
          Загрузить в галерею
        </Button>
      )}
    </Stack>
  );
};
