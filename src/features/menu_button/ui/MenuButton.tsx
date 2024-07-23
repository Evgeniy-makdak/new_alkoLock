import { type FC, type MouseEvent, type ReactNode, useState } from 'react';

// Импорт cookieManager
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExitToAppOutlinedIcon from '@mui/icons-material/ExitToAppOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import {
  Divider,
  Menu,
  MenuItem,
  Button as MuiButton,
  Tooltip,
  type TooltipProps,
} from '@mui/material';

import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';

import style from './MenuButton.module.scss';

/**
 * @prop toggleModal - функция открывающая/закрывающая модальное окно по изменению пароля пользователя
 * @prop close - функция закрывающая модальное окно по изменению пароля пользователя
 * @props email - JSX или string для отображения почты пользователя
 * @prop collops - флаг который говорит о том, что меню схлопнуто и нужно показывать миниатюру в виде иконки
 * @prop tooltipProps - все стандартные пропсы tooltip кроме title - он уже использован и даже если передать
 * его то он не будет использован. Тоже самое с children - он уже есть у tooltip
 */
type MenuButtonProps = {
  toggleModal: () => void;
  close: () => void;
  email: string | ReactNode;
  collops?: boolean;
  tooltipProps?: Omit<TooltipProps, 'title' | 'children'>;
};

export const MenuButton: FC<MenuButtonProps> = ({
  close,
  toggleModal,
  email,
  collops,
  tooltipProps,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { logout } = appStore((state) => state);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    close();
    setAnchorEl(null);
  };

  return (
    <Tooltip {...tooltipProps} title={email} disableHoverListener={!collops}>
      <div>
        <MuiButton
          onClick={handleClick}
          data-testid={testids.widget_navbar.NAVBAR_POPUP_BUTTON}
          aria-controls={anchorEl ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={anchorEl ? 'true' : undefined}
          sx={{
            minWidth: '56px',
            background: '#667A8A',
            color: 'white',
            padding: '9px 18px',
            '&:hover': {
              background: '#667A8A',
            },
            justifyContent: 'space-between',
            overflow: 'hidden',
            width: collops ? '50px' : '100%',
            paddingX: 1,
            span: {
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            },
          }}>
          {!collops && <span>{email}</span>}
          {collops && <PersonOutlineOutlinedIcon />}
          <ArrowDropDownIcon
            sx={{
              transform: `rotate(${anchorEl ? 180 : 0}deg)`,
              transition: 'all .15s ease',
            }}
          />
        </MuiButton>

        <Menu
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
            sx: {
              width: collops ? '56px' : '100%',
            },
          }}>
          <MenuItem
            data-testid={testids.widget_navbar.NAVBAR_POPUP_CHANGE_PASSWORD_BUTTON}
            onClick={() => {
              setAnchorEl(null);
              toggleModal();
            }}
            className={`${style.menuItem} ${collops ? style.center : style.between}`}>
            {!collops && <span>Изменить пароль</span>}
            <EditOutlinedIcon />
          </MenuItem>

          <Divider />

          <MenuItem
            data-testid={testids.widget_navbar.NAVBAR_POPUP_CHANGE_EXIT_BUTTON}
            className={`${style.menuItem} ${collops ? style.center : style.between}`}
            onClick={logout}>
            {!collops && <span>Выйти</span>}
            <ExitToAppOutlinedIcon />
          </MenuItem>
        </Menu>
      </div>
    </Tooltip>
  );
};
