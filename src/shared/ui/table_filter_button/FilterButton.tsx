import { useTranslation } from 'react-i18next';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Button as MuiButton, Tooltip } from '@mui/material';

import style from './FilterButton.module.scss';

interface FilterButtonProps {
  open?: boolean;
  toggle: () => void;
  active?: boolean;
  testid: string;
}

export const FilterButton = ({ open, toggle, active, testid }: FilterButtonProps) => {
  const { t } = useTranslation();
  return (
    <MuiButton
      data-testid={testid}
      onClick={toggle}
      className={`${style.filterButton} ${active ? style.active : style.close}`}>
      <span>{t('common.filter')}</span>

      <Tooltip title={open ? t('nav.collapse') : t('nav.expand')}>
        <ArrowDropDownIcon
          sx={{
            transform: `rotate(${open ? 180 : 0}deg)`,
            transition: 'all .15s ease',
          }}
        />
      </Tooltip>
    </MuiButton>
  );
};
