import { useTranslation } from 'react-i18next';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Button as MuiButton, Tooltip } from '@mui/material';

import style from './FilterButton.module.scss';

interface FilterButtonProps {
  open?: boolean;
  toggle: () => void;
  active?: boolean;
  testid: string;
  disabled?: boolean;
  /** Только иконка фильтра (узкая кнопка), без текста «Фильтр». */
  iconOnly?: boolean;
}

export const FilterButton = ({
  open,
  toggle,
  active,
  testid,
  disabled,
  iconOnly,
}: FilterButtonProps) => {
  const { t } = useTranslation();
  const expandTip = open ? t('nav.collapse') : t('nav.expand');

  const button = (
    <MuiButton
      data-testid={testid}
      onClick={toggle}
      disabled={disabled}
      aria-label={iconOnly ? t('common.filter') : undefined}
      aria-expanded={iconOnly ? Boolean(open) : undefined}
      className={`${style.filterButton} ${iconOnly ? style.iconOnly : ''} ${
        active ? style.active : style.close
      }`}>
      {iconOnly ? (
        <FilterListIcon fontSize="small" />
      ) : (
        <>
          <span>{t('common.filter')}</span>

          <Tooltip title={expandTip}>
            <ArrowDropDownIcon
              sx={{
                transform: `rotate(${open ? 180 : 0}deg)`,
                transition: 'all .15s ease',
              }}
            />
          </Tooltip>
        </>
      )}
    </MuiButton>
  );

  if (iconOnly) {
    return (
      <Tooltip title={expandTip}>
        <span className={style.iconOnlyTooltipAnchor}>{button}</span>
      </Tooltip>
    );
  }

  return button;
};
