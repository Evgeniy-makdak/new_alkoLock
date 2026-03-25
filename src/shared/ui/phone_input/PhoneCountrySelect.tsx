import { type ElementType, type FocusEvent, type MouseEvent, useMemo, useState } from 'react';
import type { Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

import { Divider, ListItemIcon, Menu, MenuItem } from '@mui/material';

import styles from './PhoneCountrySelect.module.scss';

export type CountrySelectOption = {
  value?: string;
  label: string;
  divider?: boolean;
};

type IconProps = {
  'aria-hidden'?: boolean;
  country?: Country;
  label: string;
  aspectRatio?: number;
};

type Props = {
  value?: Country;
  options: CountrySelectOption[];
  onChange: (country: Country | undefined) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  iconComponent: ElementType<IconProps>;
  name?: string;
  'aria-label'?: string;
  className?: string;
  arrowComponent?: ElementType;
};

function getSelectedOption(options: CountrySelectOption[], value: Country | undefined) {
  const current = value ?? 'ZZ';
  for (const opt of options) {
    if (opt.divider) continue;
    const v = opt.value ?? 'ZZ';
    if (v === current) return opt;
  }
}

function MenuCountryFlag({ countryCode }: { countryCode?: string }) {
  if (!countryCode || countryCode === 'ZZ') {
    return (
      <span className={styles.intlGlyph} aria-hidden>
        🌐
      </span>
    );
  }
  const F = (flags as Record<string, ElementType<{ title?: string; className?: string }>>)[
    countryCode
  ];
  if (!F) {
    return (
      <span className={styles.intlGlyph} aria-hidden>
        ?
      </span>
    );
  }
  return <F title="" className={styles.menuFlag} />;
}

function DefaultArrow() {
  return <div className="PhoneInputCountrySelectArrow" />;
}

export function PhoneCountrySelect({
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  disabled,
  readOnly,
  iconComponent: Icon,
  name,
  'aria-label': ariaLabel,
  className,
  arrowComponent: Arrow,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const selectedOption = useMemo(() => getSelectedOption(options, value), [options, value]);
  const ArrowEl = Arrow ?? DefaultArrow;

  const handleOpen = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled || readOnly) return;
    setAnchorEl(e.currentTarget);
    onFocus?.(e as unknown as FocusEvent<HTMLElement>);
  };

  const handleClose = () => {
    setAnchorEl(null);
    onBlur?.({} as FocusEvent<HTMLElement>);
  };

  const pick = (opt: CountrySelectOption) => {
    if (opt.divider) return;
    const raw = opt.value ?? 'ZZ';
    onChange(raw === 'ZZ' ? undefined : (raw as Country));
    setAnchorEl(null);
  };

  const triggerClass = ['PhoneInputCountrySelect', className, styles.trigger]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="PhoneInputCountry">
      <button
        type="button"
        name={name}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={Boolean(disabled || readOnly)}
        className={triggerClass}
        onClick={handleOpen}
      />
      {selectedOption && <Icon aria-hidden country={value} label={selectedOption.label} />}
      <ArrowEl />

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        sx={{ zIndex: 2000 }}
        MenuListProps={{
          autoFocusItem: true,
          sx: { maxHeight: 360, py: 0 },
        }}>
        {options.map((opt, i) => {
          if (opt.divider) {
            return <Divider key={`div-${i}`} component="li" />;
          }
          const code = opt.value ?? 'ZZ';
          const isIntl = code === 'ZZ';
          const current = value ?? 'ZZ';
          const selected = current === code;

          return (
            <MenuItem key={`${code}-${i}`} selected={selected} onClick={() => pick(opt)}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <MenuCountryFlag countryCode={isIntl ? undefined : code} />
              </ListItemIcon>
              <span>{opt.label}</span>
            </MenuItem>
          );
        })}
      </Menu>
    </div>
  );
}
