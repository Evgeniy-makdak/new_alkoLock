/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unused-vars */
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import { CircularProgress, Skeleton, Stack, Tooltip } from '@mui/material';

import type { ImageStateInStore } from '@entities/upload_img';
import { Permissions } from '@shared/config/permissionsEnums';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { ImageView } from '@shared/ui/image_view';

import { useUserFotoItem } from '../hooks/useUserFotoItem';
// Перечень прав
import { ErrorLoadImg } from './ErrorLoadImg';
import style from './UserFotoItem.module.scss';

type UserFotoItemProps = {
  imageItem: ImageStateInStore;
  userId: ID;
  /** Активен ли пользователь (из строки таблицы) — без отдельного GET api/users на каждую миниатюру */
  userActive: boolean;
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
  userActive,
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

  const permissions = appStore((state) => state.permissions);
  const isGlobalAdmin = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
  const isEdit = permissions.includes(Permissions.PERMISSION_USER_EDIT);

  // Логика проверки для кнопок
  const isDisabled = (): boolean => {
    if (!isEdit || !userActive) return true;
    return userId === 1 ? !isGlobalAdmin : false;
  };

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
              {/* Кнопка "Удалить фото" с проверкой */}
              {!isDisabled() && (
                <Tooltip title="Удалить фото из галереи">
                  <span onClick={handleDeleteImage}>
                    <DeleteForeverOutlinedIcon color={'inherit'} />
                  </span>
                </Tooltip>
              )}

              {/* Кнопка "Сменить фото профиля" с проверкой */}
              {!isAvatar && !isDisabled() && (
                <Tooltip title="Сменить фото профиля">
                  <span onClick={handleChangeAvatar}>
                    <AccountCircleOutlinedIcon color={'inherit'} />
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
