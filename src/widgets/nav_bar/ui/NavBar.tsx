import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined';

import { MenuButton } from '@features/menu_button';
import { NavbarBranchSelect } from '@features/nav_bar_branch_select';
import { PasswordForm } from '@features/password_form';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { StorageKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { useLocalStorage } from '@shared/hooks/useLocalStorage';
import { useToggle } from '@shared/hooks/useToggle';
import { Logo } from '@shared/images/logo';
import { Popup } from '@shared/ui/popup';

import { NAV_LINKS, frontendVersion } from '../config/const';
import { tooltipStyle } from '../config/styles';
import { useNavBar } from '../hooks/useNavBar';
import style from './NavBar.module.scss';

export const NavBar = () => {
  const [open, toggle, close] = useToggle();
  const { state, setItemState } = useLocalStorage({
    key: StorageKeys.NAVBAR_COLLOPS_MENU,
    value: false,
  });
  const { length, permissionsFilter, email } = useNavBar();
  const handleCollops = () => {
    setItemState(!state);
  };

  const [backendVersion, setBackendVersion] = useState('');

  useEffect(() => {
    fetch('/api/backend-version')
      .then(response => response.json())
      .then(data => setBackendVersion(data.version))
      .catch(error => console.error('Error fetching backend version:', error));
  }, []);

  return (
    <>
      <div className={`${state ? style.navBarCollops : style.navBarOpen} ${style.wrapper}`}>
        <div className={`${style.logo} ${!state && style.between}`}>
          <Logo className={style.img} />
          {!state && <span className={style.logoText}>Лазерные системы</span>}
        </div>
        <div className={`${state ? style.navBarCollops : style.navBarOpen} ${style.navBar}`}>
          <div className={style.navBarWrapper}>
            <NavbarBranchSelect
              tooltipProps={{ slotProps: tooltipStyle, placement: 'right' }}
              isCollops={state}
            />

            <div className={style.links}>
              {NAV_LINKS.filter(permissionsFilter).map((link, i) => {
                const notification = link.path === RoutePaths.autoService;

                return (
                  <Tooltip
                    placement="right"
                    slotProps={tooltipStyle}
                    disableHoverListener={!state}
                    title={link.name}
                    key={link.path}>
                    <NavLink
                      key={link.path}
                      // использую индексы потому, что test атрибуты статичны и не должны меняться
                      data-testid={testids.widget_navbar.NAVBAR_LINK[i]}
                      className={`${state ? style.center : style.between} ${style.navLink}`}
                      to={link.path}>
                      {!state && <span>{link.name}</span>}
                      <span>{link.icon}</span>
                      {notification && <span className={style.notifications}>{length}</span>}
                    </NavLink>
                  </Tooltip>
                );
              })}
            </div>
            {!state && (
              <div className={style.versionContainer}>
                <div className={style.versionItem}>
                  <Typography variant="inherit" className={style.versionText}>
                    frontend v: {frontendVersion}
                  </Typography>
                </div>
                <div className={style.versionItem}>
                  <Typography variant="inherit" className={style.versionText}>
                    backend v: {backendVersion}
                  </Typography>
                </div>
              </div>
            )}
          </div>
          <Stack gap={1}>
            <MenuButton
              tooltipProps={{ slotProps: tooltipStyle, placement: 'right' }}
              collops={state}
              email={email}
              close={close}
              toggleModal={toggle}
            />
            <Button
              onClick={handleCollops}
              className={`${style.navBarButton} ${!state && style.between}`}>
              {!state && (
                <span className={`${state && style.textCollops} ${style.text}`}>Скрыть</span>
              )}
              <span className={`${state && style.collops} ${style.openedCollops}`}>
                <ArrowBackIosNewOutlinedIcon />
              </span>
            </Button>
          </Stack>
        </div>
      </div>
      <Popup
        isOpen={open}
        toggleModal={toggle}
        closeonClickSpace={false}
        body={<PasswordForm close={close} />}
        onCloseModal={close}
      />
    </>
  );
};
