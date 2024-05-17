import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Button as MuiButton } from '@mui/material';

import style from './FilterButton.module.scss';

interface FilterButtonProps {
  open?: boolean;
  toggle: () => void;
  active?: boolean;
  testid: string;
}

export const FilterButton = ({ open, toggle, active, testid }: FilterButtonProps) => {
  return (
    <MuiButton
      data-testid={testid}
      onClick={toggle}
      className={`${style.filterButton} ${active ? style.active : style.close}`}>
      <span>Фильтр</span>

      <ArrowDropDownIcon
        sx={{
          transform: `rotate(${open ? 180 : 0}deg)`,
          transition: 'all .15s ease',
        }}
      />
    </MuiButton>
  );
};
