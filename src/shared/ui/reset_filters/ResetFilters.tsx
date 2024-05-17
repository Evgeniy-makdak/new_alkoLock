import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { IconButton, Tooltip } from '@mui/material';

import style from './ResetFilters.module.scss';

interface ResetFiltersProps {
  reset: () => void;
  title: string;
}

export const ResetFilters = ({ reset, title }: ResetFiltersProps) => {
  return (
    <Tooltip title={title}>
      <IconButton onClick={reset}>
        <CleaningServicesIcon className={style.icon} />
      </IconButton>
    </Tooltip>
  );
};
