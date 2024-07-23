import { type FC } from 'react';

import { Stack } from '@mui/material';

import { UploadImg } from '@entities/upload_img';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useUserAddFoto } from '../hooks/useUserAddFoto';
import style from './UserAddFoto.module.scss';

type UserAddFoto = {
  userId: ID;
};

export const UserAddFoto: FC<UserAddFoto> = ({ userId }) => {
  const { setUploadImage, lengthMoreZero, uploadImage, onSubmit, isLoading } =
    useUserAddFoto(userId);

  return (
    <Stack direction={'column'} maxWidth={'570px'}>
      <UploadImg
        labelStyle={style.labelStyle}
        multiple
        images={uploadImage}
        setImage={setUploadImage}
      />

      {lengthMoreZero && (
        <Button isLoading={isLoading} onClick={onSubmit}>
          Загрузить в галерею
        </Button>
      )}
    </Stack>
  );
};
