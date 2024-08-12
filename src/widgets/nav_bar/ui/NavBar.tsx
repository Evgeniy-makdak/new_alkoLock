import { NavLink } from 'react-router-dom';

import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined';
import { Button, Stack, Tooltip, Typography } from '@mui/material';

import { MenuButton } from '@features/menu_button';
import { NavbarBranchSelect } from '@features/nav_bar_branch_select';
import { PasswordForm } from '@features/password_form';
import { AccountApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { QueryKeys, StorageKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
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

  const { data } = useConfiguredQuery([QueryKeys.BACKEND_VERSION], AccountApi.getBackandVersion, {
    triggerOnBranchChange: false,
  });

  const backendVersion = data?.data as string;

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
          </div>
          <div>
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
