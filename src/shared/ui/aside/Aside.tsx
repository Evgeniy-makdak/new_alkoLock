import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { IconButton, Tooltip, useMediaQuery } from '@mui/material';

import { testids } from '@shared/const/testid';

import style from './Aside.module.scss';

interface AsideProps {
  children: ReactNode;
  onClose: () => void;
  onReturnToOrigin?: () => void;
  testid?: string;
  style?: React.CSSProperties;
  fullScreenOnMobile?: boolean;
}

export const Aside = ({
  children,
  onClose,
  onReturnToOrigin,
  testid,
  fullScreenOnMobile = false,
}: AsideProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width:768px)');
  const shouldUseMobileFullscreen = fullScreenOnMobile && isMobile;

  return (
    <div
      data-testid={testid}
      className={`${style.aside} ${shouldUseMobileFullscreen ? style.asideFullscreenMobile : ''}`}>
      {children}

      <Tooltip title={t('aside.collapseWindow')}>
        <IconButton
          color="info"
          data-testid={testids.INFO_TAB_CLOSE_BUTTON}
          className={`${style.close} ${shouldUseMobileFullscreen ? style.closeFullscreenMobile : ''}`}
          onClick={onClose}>
          <ArrowBackIosNewIcon />
        </IconButton>
      </Tooltip>
      {onReturnToOrigin && (
        <Tooltip title={t('aside.returnToOrigin', 'Вернуться назад')}>
          <IconButton
            color="info"
            className={`${style.return} ${shouldUseMobileFullscreen ? style.returnFullscreenMobile : style.returnDesktop}`}
            onClick={onReturnToOrigin}>
            <UndoRoundedIcon />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
};
