import { ReactNode } from 'react';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { IconButton } from '@mui/material';

import { testids } from '@shared/const/testid';

import style from './Aside.module.scss';

interface AsideProps {
  children: ReactNode;
  onClose: () => void;
  testid?: string;
}

export const Aside = ({ children, onClose, testid }: AsideProps) => {
  return (
    <div data-testid={testid} className={style.aside}>
      {children}

      <IconButton
        color="info"
        data-testid={testids.INFO_TAB_CLOSE_BUTTON}
        className={style.close}
        onClick={onClose}>
        <ArrowBackIosNewIcon />
      </IconButton>
    </div>
  );
};
