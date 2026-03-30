import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip } from '@mui/material';

import style from './imageView.module.scss';

type ImageViewProps = {
  styleWrapper?: string;
  styleImage?: string;
  onClick?: () => void;
  src?: string;
};

export const IMAGE_PREVIEW_WRAPPER_STYLE = style.wrapper;

export const ImageView: FC<ImageViewProps> = ({ styleImage, styleWrapper, onClick, src }) => {
  const { t } = useTranslation();
  return (
    // eslint-disable-next-line prettier/prettier
    <Tooltip
      title={t('tooltips.viewPhoto')}
      PopperProps={{
        modifiers: [
          {
            name: 'preventOverflow',
            options: {
              boundary: 'window',
            },
          },
          {
            name: 'offset',
            options: {
              offset: [0, -180],
            },
          },
        ],
      }}>
      <span onClick={onClick} className={`${styleWrapper} ${style.wrapper}`}>
        <img src={src} className={`${styleImage}`} />
      </span>
    </Tooltip>
  );
};
