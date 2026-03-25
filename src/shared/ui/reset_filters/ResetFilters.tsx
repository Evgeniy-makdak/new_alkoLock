import { useTranslation } from 'react-i18next';

import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { IconButton, Tooltip } from '@mui/material';

interface ResetFiltersProps {
  reset: () => void;
  /** Если не передан — берётся из `common.resetFilters` текущей локали. */
  title?: string;
}

export const ResetFilters = ({ reset, title }: ResetFiltersProps) => {
  const { t } = useTranslation();
  const tooltipTitle = title ?? t('common.resetFilters');

  return (
    <Tooltip title={tooltipTitle}>
      <IconButton onClick={reset} color="inherit">
        <CleaningServicesIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};
