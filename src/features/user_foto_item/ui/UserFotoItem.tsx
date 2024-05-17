/* eslint-disable @typescript-eslint/no-unused-vars */
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import { CircularProgress, Skeleton, Stack, Tooltip } from '@mui/material';

import type { ImageStateInStore } from '@entities/upload_img';
import type { ID } from '@shared/types/BaseQueryTypes';
import { ImageView } from '@shared/ui/image_view';

import { useUserFotoItem } from '../hooks/useUserFotoItem';
import { ErrorLoadImg } from './ErrorLoadImg';
import style from './UserFotoItem.module.scss';

type UserFotoItemProps = {
  imageItem: ImageStateInStore;
  userId: ID;
  onClickView: () => void;
  deleteImageMemo: (imageID: ID) => void;
  setImageToStoreAfterLoadingMemo: (image: ImageStateInStore) => void;
  changeAvatarMemo: (idImage: ID) => void;
};

export const UserFotoItem = ({
  imageItem,
  onClickView,
  setImageToStoreAfterLoadingMemo,
  deleteImageMemo,
  changeAvatarMemo,
  userId,
}: UserFotoItemProps) => {
  const {
    isLoadingImage,
    handleDeleteImage,
    isError,
    isDeleteImage,
    handleChangeAvatar,
    isLoadingChangeAvatar,
  } = useUserFotoItem(
    imageItem,
    setImageToStoreAfterLoadingMemo,
    deleteImageMemo,
    changeAvatarMemo,
    userId,
  );
  const isSavedInDataBase = imageItem?.isSavedInDataBase || false;

  const showImage = isSavedInDataBase && imageItem?.src && !isDeleteImage;
  const showLoading =
    (!isSavedInDataBase && !isLoadingImage) || isDeleteImage || isLoadingChangeAvatar;
  const showSkeleton = isLoadingImage && !imageItem?.src && !isDeleteImage;
  const showError = !imageItem?.src && !isLoadingImage && isError;
  const isAvatar = imageItem?.isAvatar || false;

  if (showSkeleton) {
    return <Skeleton className={style.skeleton} animation="wave" />;
  } else if (showError) {
    return <ErrorLoadImg />;
  }
  return (
    <>
      <figure className={`${style.imageItem} ${style.animateOnFirstRender}`}>
        <ImageView styleWrapper={style.imageWrapper} src={imageItem?.src} />
        {showImage && (
          <>
            <Stack
              alignItems={'center'}
              className={`${style.actions}`}
              direction={'row'}
              justifyContent={'space-around'}>
              <Tooltip title="Удалить фото из галереи">
                <span onClick={handleDeleteImage}>
                  <DeleteForeverOutlinedIcon />
                </span>
              </Tooltip>
              {!isAvatar && (
                <Tooltip title="Сменить фото профиля">
                  <span onClick={handleChangeAvatar}>
                    <AccountCircleOutlinedIcon />
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Посмотреть фото">
                <span onClick={onClickView}>
                  <RemoveRedEyeOutlinedIcon />
                </span>
              </Tooltip>
            </Stack>
            {isAvatar && (
              <Tooltip title="Аватар профиля">
                <span className={style.avatar}>
                  <AccountCircleOutlinedIcon />
                </span>
              </Tooltip>
            )}
          </>
        )}
        {showLoading && <CircularProgress className={style.clock} />}
      </figure>
    </>
  );
};
