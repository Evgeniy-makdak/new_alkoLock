import type { FC } from 'react';

import style from './imageView.module.scss';

type ImageViewProps = {
  styleWrapper?: string;
  styleImage?: string;
  onClick?: () => void;
  src?: string;
};

export const IMAGE_PREVIEW_WRAPPER_STYLE = style.wrapper;

export const ImageView: FC<ImageViewProps> = ({ styleImage, styleWrapper, onClick, src }) => {
  return (
    <span onClick={onClick} className={`${styleWrapper} ${style.wrapper}`}>
      <img src={src} className={`${styleImage}`} />
    </span>
  );
};
