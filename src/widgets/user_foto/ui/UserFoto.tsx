/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC, type ReactNode } from 'react';

import { Stack } from '@mui/material';

import { UserAddFoto } from '@features/user_add_foto';
import { UserFotoItem } from '@features/user_foto_item';
import type { ID } from '@shared/types/BaseQueryTypes';
import { ImagePreview } from '@shared/ui/image_preview/ui/ImagePreview';
import { Loader } from '@shared/ui/loader';
import { TouchLoader } from '@shared/ui/touch_loader';

import { useUserFoto } from '../hooks/useUserFoto';
import style from './UserFoto.module.scss';

type UserFoto = {
  userId: ID;
};

const ItemWrapper = ({ children, ...props }: { children: ReactNode }) => (
  <div {...props} className={style.listItem}>
    {children}
  </div>
);

export const UserFoto: FC<UserFoto> = ({ userId }) => {
  const {
    open,
    selectImg,
    setSelectImg,
    images,
    setImageToStoreAfterLoadingMemo,
    deleteImageMemo,
    changeAvatarMemo,
    isLoadingListUrl,
  } = useUserFoto(userId);

  return (
    <Loader isLoading={false}>
      <Stack className={style.wrapper} gap={1} width={'580px'}>
        <UserAddFoto userId={userId} />
        {isLoadingListUrl ? (
          <TouchLoader />
        ) : (
          <Stack className={style.listWrapper} direction={'row'} flexWrap={'wrap'} gap={1}>
            {images.map((img) => {
              return (
                <ItemWrapper key={img?.url}>
                  <UserFotoItem
                    changeAvatarMemo={changeAvatarMemo}
                    userId={userId}
                    imageItem={img}
                    deleteImageMemo={deleteImageMemo}
                    setImageToStoreAfterLoadingMemo={setImageToStoreAfterLoadingMemo}
                    onClickView={() => setSelectImg(img.src)}
                  />
                </ItemWrapper>
              );
            })}
          </Stack>
        )}
      </Stack>
      <ImagePreview close={() => setSelectImg(null)} open={open} src={selectImg} />
    </Loader>
  );
};
