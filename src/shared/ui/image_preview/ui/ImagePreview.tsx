import type { FC } from 'react';

import { Dialog } from '@mui/material';

import style from './ImagePreview.module.scss';

type ImagePreviewProps = {
  open: boolean;
  close: () => void;
  src?: string;
  imgStyle?: string;
};

export const ImagePreview: FC<ImagePreviewProps> = ({ close, open, src, imgStyle }) => {
  return (
    <Dialog onClose={close} open={open}>
      <img className={imgStyle ? imgStyle : style.img} src={src} />
    </Dialog>
  );
};
