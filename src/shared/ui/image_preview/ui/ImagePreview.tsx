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
  const handleImageClick = () => {
    close();
  };

  const handleDialogClick = () => {
    close();
  };

  return (
    <Dialog
      onClose={close}
      open={open}
      onClick={handleDialogClick}
      PaperProps={{
        sx: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          overflow: 'hidden',
        },
      }}>
      <img
        className={imgStyle ? imgStyle : style.img}
        src={src}
        onClick={handleImageClick}
        style={{ cursor: 'pointer' }}
        alt="Preview"
      />
    </Dialog>
  );
};
