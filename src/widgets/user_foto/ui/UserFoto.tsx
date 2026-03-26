/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC, type ReactNode, useMemo } from 'react';

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
  userActive: boolean;
};

const ItemWrapper = ({ children, ...props }: { children: ReactNode }) => (
  <div {...props} className={style.listItem}>
    {children}
  </div>
);

export const UserFoto: FC<UserFoto> = ({ userId, userActive }) => {
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

  const uniqueImages = useMemo(() => {
    const seen = new Set<string>();
    return images.filter((img) => {
      const idPart = img?.id != null ? `id:${img.id}` : null;
      const hashPart = img?.hash ? `h:${img.hash}` : null;
      const urlPart = img?.url ? `u:${img.url}` : null;
      const key = idPart || hashPart || urlPart;
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [images]);

  return (
    <Loader isLoading={false}>
      <Stack className={style.wrapper} gap={1} width={'580px'}>
        <UserAddFoto userId={userId} userActive={userActive} />
        {isLoadingListUrl ? (
          <TouchLoader />
        ) : (
          <Stack className={style.listWrapper} direction={'row'} flexWrap={'wrap'} gap={1}>
            {uniqueImages.map((img, index) => {
              const stableKey = img?.id ?? img?.hash ?? img?.url ?? `idx-${index}`;
              return (
                <ItemWrapper key={String(stableKey)}>
                  <UserFotoItem
                    changeAvatarMemo={changeAvatarMemo}
                    userId={userId}
                    userActive={userActive}
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
