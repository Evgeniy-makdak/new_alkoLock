/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC, type ReactNode, useMemo, useRef } from 'react';

import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import { Stack, Typography } from '@mui/material';

import { useUserFotoItem } from '@features/user_foto_item/hooks/useUserFotoItem';
import { UsersApi } from '@shared/api/baseQuerys';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { ImagePreview } from '@shared/ui/image_preview/ui/ImagePreview';
import { ImageView } from '@shared/ui/image_view';
import { useUserFoto } from '@widgets/user_foto/hooks/useUserFoto';

import { ACCEPT_FORMATS } from '../configs/const';
import { type ImageState, useUploadImg } from '../hooks/useUploadImg';
import { handleScroll } from '../lib/helpers';
import style from './UploadImg.module.scss';

/**
 * @prop textFieldProps - пропсы для input
 * @prop title - заголовок для всего компонента (не в внутри input)
 * @prop multiple - можно ли загружать больше 1 фотографии - будет выбирать последнею фотографию из загружаемого списка если
 * multiple=false
 * @prop labelStyle - можно перезаписать стили обертки с border dash (пунктир) если нужно или добавить любые другие
 * @prop setImage - функция принимающая новое состояние (она сама разворачивает старое состояние, поэтому не нужно делать это сверху setImage([...newState, ...prev]))
 * @prop images - состояние компонента - должно соответствовать типу {@link ImageState}
 * @prop limit - ограничение загружаемы картинок (по умолчанию 10)
 * @prop TODO prop - в будующем добавить пропс formats = [string] - сейчас он захордкожен в самом компоненте
 * @prop testId - строка для атрибута чтоб подцепить в Selenium автотесты
 *  */
type UploadImgProps = {
  textFieldProps?: Omit<
    React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
    'type'
  >;
  title?: string | ReactNode;
  multiple?: boolean;
  labelStyle?: string;
  setImage: (data: ImageState[]) => void;
  images: ImageState[];
  limit?: number;
  testId?: string;
  userId?: ID;
};

const deleteImage = UsersApi.deletePhotosFromGallery;

export const UploadImg: FC<UploadImgProps> = ({
  textFieldProps,
  title,
  multiple = false,
  labelStyle,
  setImage,
  images,
  limit,
  testId,
  userId,
}) => {
  const INPUT_ID = 'contained-button-file' + Date.now();
  const refDiv = useRef();
  const {
    preview,
    handleDeleteImg,
    closePreview,
    openPreview,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    stateDrop,
    handleLoadImg,
    inputRef,
  } = useUploadImg(multiple, images, setImage, limit);

  // Реализация функции для вытягивания id фото, когда бэк предоставит данное поле. В строке await deleteImage(avatar.toString()); 
  // надо будет заменить avatar на userPhotoId:
  // const handleDeleteUserPhoto = async () => {
  //   try {
  //     const response = await UsersApi.getUser(userId);
  //     const userPhotoId = response.data.id;
  //     console.log(userPhotoId);
  //   } catch (error) {
  //     console.error('photoId не найдено', error);
  //   }
  // };
  // handleDeleteUserPhoto();

  const photoData = useUserFoto(userId);
  const { setImageToStoreAfterLoadingMemo } = useUserFoto(userId);
  useUserFotoItem(
    photoData.images[0],
    setImageToStoreAfterLoadingMemo,
    () => {},
    () => {},
    userId,
  );

  const avatar = useMemo(() => photoData.images[0], [photoData]);

  return (
    <>
      <Stack data-testid={testId} gap={1}>
        <Typography>{title}</Typography>
        <Stack gap={1} direction={'row'}>
          <form
            data-testid={testids.UPLOAD_FILE_FORM_WRAPPER}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            method="post"
            action="#"
            encType="multipart/form-data">
            <input
              onChange={handleLoadImg}
              ref={inputRef}
              multiple
              accept={ACCEPT_FORMATS}
              className={style.input}
              id={INPUT_ID}
              {...textFieldProps}
              type="file"
            />
            <label
              data-testid={testids.UPLOAD_FILE_LABEL}
              className={`${labelStyle} ${style.label} ${style[stateDrop]}`}
              htmlFor={INPUT_ID}>
              <span className={style.uploadText}>загрузить</span>
            </label>
          </form>
          <div
            data-testid={testids.UPLOAD_FILE_IMAGE_LIST_WRAPPER}
            ref={refDiv}
            onWheel={(e) => handleScroll(e, refDiv)}
            className={style.imageListWrapper}>
            <Stack className={style.imageList} gap={1} display={'flex'} direction={'row'}>
              {images?.map((file) => {
                return (
                  <div
                    data-testid={testids.UPLOAD_FILE_IMAGE_LIST_ITEM}
                    className={style.reletive}
                    key={file.src}>
                    <DeleteForeverOutlinedIcon
                      data-testid={testids.UPLOAD_FILE_IMAGE_LIST_ITEM_DELETE}
                      onClick={async () => {
                        try {
                          await deleteImage(avatar.toString());
                          handleDeleteImg(file.src);
                        } catch (error) {
                          // console.error('Ошибка при удалении изображения:', error);
                        }
                      }}
                      className={style.deleteIcon}
                    />
                    <RemoveRedEyeOutlinedIcon
                      data-testid={testids.UPLOAD_FILE_IMAGE_LIST_ITEM_VIEW}
                      onClick={() => openPreview(file.src)}
                      className={style.eyeIcon}
                    />
                    <ImageView
                      styleImage={style.img}
                      styleWrapper={style.paper}
                      onClick={() => openPreview(file.src)}
                      src={file.src}
                    />
                  </div>
                );
              })}
            </Stack>
          </div>
        </Stack>
      </Stack>
      <ImagePreview src={preview} open={!!preview} close={closePreview} />
    </>
  );
};
