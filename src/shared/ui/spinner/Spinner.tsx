import { CircularProgress } from '@mui/material';

import style from './Spinner.module.scss';

interface SpinnerProps {
  testid?: string;
}

export const Spinner = ({ testid }: SpinnerProps) => {
  return (
    <div data-testid={testid} className={style.wrapper}>
      <CircularProgress />
    </div>
  );
};
