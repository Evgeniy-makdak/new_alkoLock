import { useRef, useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import type { ID } from '@shared/types/BaseQueryTypes';
import { FilesUtils } from '@shared/utils/FilesUtils';

import { availableFormats } from '../configs/const';
import { filterListImages, getFileHashAndEncodeBase64, prevent } from '../lib/helpers';

enum DragState {
  ENTER = 'enter',
  LEAVE = 'leave',
}
export type ImageState = {
  hash: string | null;
  src: string;
  image: File | Blob | null;
  id?: ID;
  name?: string
};

export type ImageStateInStore = Partial<ImageState> & {
  url?: string;
  isSavedInDataBase: boolean;
  isAvatar: boolean;
};
export type ImagesStateInStore = ImageStateInStore[];

export const useUploadImg = (
  multiple: boolean,
  images: ImageState[],
  setImages: (data: ImageState[]) => void,
  limit = 10,
) => {
  const checkFormats = FilesUtils.checkFormats(availableFormats);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<null | string>(null);
  const [stateDrop, setDropState] = useState<DragState>(DragState.LEAVE);

  const handleLoadImg = async (files: FileList) => {
    if (!files || files?.length < 1) return;
    const filesLength = files.length;
    const stateLength = images?.length;
    const stateLengthMax = stateLength >= limit;
    if (filesLength + stateLength > limit) {
      enqueueSnackbar(`Нельзя загрузить картинок больше чем ${limit}`, { variant: 'warning' });
    }
    if (stateLengthMax) return;

    const arr = Array.from(files).slice(0, limit - stateLength);
    const imageFile = checkFormats(arr);

    if (multiple) {
      const filesForReq: ImageState[] = [];
      for (const file of imageFile) {
        const hash = await getFileHashAndEncodeBase64(file);
        const url = FilesUtils.getUrlFromBlob(file);
        const newState: ImageState = {
          src: url,
          hash,
          image: file,
        };

        filesForReq.push(newState);
      }
      setImages(filterListImages([...filesForReq, ...images]));
    } else {
      const file = imageFile[0];
      const url = FilesUtils.getUrlFromBlob(file);
      const hash = await getFileHashAndEncodeBase64(file);
      const reqImg: ImageState = {
        hash,
        image: file,
        src: url,
      };
      setImages([reqImg]);
    }
  };

  const handleDeleteImg = (src: string) => {
    inputRef.current.value = '';
    const newState = images.filter((item) => item.src !== src);
    setImages(newState);
  };

  const closePreview = () => {
    setPreview(null);
  };
  const openPreview = (file: string) => {
    setPreview(file);
  };

  const onDragEnter = (e: React.DragEvent<HTMLFormElement>) => {
    prevent(e);
    setDropState(DragState.ENTER);
  };

  const onDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
    prevent(e);
    setDropState(DragState.LEAVE);
  };

  const onDragOver = (e: React.DragEvent<HTMLFormElement>) => {
    prevent(e);
    if (stateDrop !== DragState.ENTER) {
      setDropState(DragState.ENTER);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLFormElement>) => {
    prevent(e);
    setDropState(DragState.LEAVE);
    const files = e?.nativeEvent?.dataTransfer?.files;
    handleLoadImg(files);
  };

  const handleEventUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleLoadImg(e?.target?.files);
  };

  return {
    preview,
    handleDeleteImg,
    closePreview,
    openPreview,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    stateDrop,
    handleLoadImg: handleEventUpload,
    inputRef,
  };
};
