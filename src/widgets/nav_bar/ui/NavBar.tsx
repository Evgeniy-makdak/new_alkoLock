import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

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
import { brandNameLabel } from '@shared/lib/brandNameLabel';
import { appStore } from '@shared/model/app_store/AppStore';
import { Popup } from '@shared/ui/popup';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { breakpoints } from '../breakpoints';
import { NAV_LINKS, frontendVersion } from '../config/const';
import { tooltipStyle } from '../config/styles';
import { useNavBar } from '../hooks/useNavBar';
import style from './NavBar.module.scss';

// Один «слот» пункта: min-height 44px + margin-bottom 17px (у последнего пункта margin 0 — это учтено в формуле ниже)
const ITEM_HEIGHT = 61; // 44 + 17

export const NavBar = () => {
  const { t, i18n } = useTranslation();
  const [open, toggle, close] = useToggle();
  const { resetStatusFilter } = useStatusFilter();
  const { state, setItemState } = useLocalStorage({
    key: StorageKeys.NAVBAR_COLLOPS_MENU,
    value: false,
  });
  const { length, permissionsFilter, email, sliderState, setSliderState } = useNavBar();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [forceUpdate, setForceUpdate] = useState(false);
  const [showMapTab, setShowMapTab] = useState(true);

  // Состояние для карусели
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleItemsCount, setVisibleItemsCount] = useState(8);
  const [isAnimating, setIsAnimating] = useState(false);
  /** Высота только под список ссылок (без кнопки «вниз»), иначе при появлении стрелки меняется perPage и дублируется последний пункт */
  const carouselLinksMeasureRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const { data } = useConfiguredQuery([QueryKeys.BACKEND_VERSION], AccountApi.getBackandVersion, {
    triggerOnBranchChange: false,
  });

  const backendVersion = data?.data as string;
  const isAdmin = appStore().isAdmin;
  const isCollapsed = state || isMobile || isTablet;

  // Фильтрация ссылок
  const getFilteredLinks = useCallback(() => {
    return NAV_LINKS.filter((link) => {
      if (!permissionsFilter(link)) return false;

      if (link.path === RoutePaths.map) {
        return sliderState && showMapTab;
      }

      if (
        sliderState &&
        (link.path === RoutePaths.templates ||
          link.path === RoutePaths.settings ||
          link.path === RoutePaths.reports)
      ) {
        return false;
      }

      if (
        !sliderState &&
        link.path !== RoutePaths.templates &&
        link.path !== RoutePaths.settings &&
        link.path !== RoutePaths.reports
      ) {
        return false;
      }

      return true;
    });
  }, [permissionsFilter, sliderState, showMapTab]);

  const filteredLinks = getFilteredLinks();

  const measureItemsPerPage = useCallback(() => {
    const el = carouselLinksMeasureRef.current;
    if (!el) return;
    try {
      const cs = window.getComputedStyle(el);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const availableHeight = Math.max(0, el.clientHeight - padY - 20);
      // n пунктов занимают: n*44 + (n-1)*17 = n*ITEM_HEIGHT - 17 (последний без margin-bottom)
      // => максимальное n: floor((H + 17) / ITEM_HEIGHT). Старая формула floor(H/61) занижала n на 1 — вторая «страница» начиналась с последнего пункта первой.
      const count = Math.max(1, Math.floor((availableHeight + 17) / ITEM_HEIGHT));
      setVisibleItemsCount(count);
    } catch {
      /* ignore */
    }
  }, []);

  useLayoutEffect(() => {
    measureItemsPerPage();
  }, [filteredLinks.length, measureItemsPerPage]);

  useEffect(() => {
    const el = carouselLinksMeasureRef.current;
    if (!el) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      measureItemsPerPage();
    });
    resizeObserverRef.current.observe(el);

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [measureItemsPerPage]);

  const itemsPerPage = Math.max(1, visibleItemsCount);
  const totalPages =
    filteredLinks.length === 0 ? 1 : Math.max(1, Math.ceil(filteredLinks.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage((p) => {
      const perPage = Math.max(1, visibleItemsCount);
      const tp =
        filteredLinks.length === 0 ? 1 : Math.max(1, Math.ceil(filteredLinks.length / perPage));
      return p >= tp ? Math.max(0, tp - 1) : p;
    });
  }, [filteredLinks.length, visibleItemsCount]);

  const getCurrentLinks = useCallback(() => {
    const start = currentPage * itemsPerPage;
    return filteredLinks.slice(start, start + itemsPerPage);
  }, [currentPage, filteredLinks, itemsPerPage]);

  const handleCollops = () => {
    setItemState(!state);
  };

  const handleLogoClick = () => {
    if (!sliderState) {
      setSliderState(true);
    }
    resetStatusFilter();
    navigate(RoutePaths.events);
  };

  const handleSwitchChange = () => {
    const newState = !sliderState;
    setSliderState(newState);
    navigate(
      newState
        ? RoutePaths.events
        : location.pathname === RoutePaths.settings
          ? RoutePaths.settings
          : location.pathname === RoutePaths.reports
            ? RoutePaths.reports
            : RoutePaths.templates,
    );
  };

  useEffect(() => {
    if (location.pathname === RoutePaths.templates) {
      setSliderState(false);
    } else if (location.pathname === RoutePaths.settings) {
      setSliderState(false);
    } else if (location.pathname === RoutePaths.reports) {
      setSliderState(false);
    }
  }, [location.pathname, setSliderState]);

  useEffect(() => {
    const unlisten = () => {
      setForceUpdate((prev) => !prev);
    };

    window.addEventListener('popstate', unlisten);
    return () => {
      window.removeEventListener('popstate', unlisten);
    };
  }, []);

  // Обработчик комбинации клавиш для показа вкладки "Карта"
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Для всех платформ: Control + Shift + M
      const isCtrl = event.ctrlKey;
      const isShift = event.shiftKey;

      const isMKey =
        event.key === 'm' || event.key === 'M' || event.key === 'ь' || event.key === 'Ь';

      if (isCtrl && isShift && isMKey) {
        event.preventDefault();
        setShowMapTab((prev) => {
          const newState = !prev;

          if (!newState && location.pathname === RoutePaths.map) {
            navigate(RoutePaths.events);
          }

          return newState;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [location.pathname, navigate]);

  // Обработчики для страничной навигации
  const handleNext = () => {
    if (isAnimating) return;

    if (currentPage < totalPages - 1) {
      setIsAnimating(true);
      setCurrentPage(currentPage + 1);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const handlePrev = () => {
    if (isAnimating) return;

    if (currentPage > 0) {
      setIsAnimating(true);
      setCurrentPage(currentPage - 1);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const currentLinks = getCurrentLinks();
  const canScrollUp = currentPage > 0;
  const canScrollDown = currentPage < totalPages - 1;

  const renderNavLink = (link: (typeof NAV_LINKS)[0], index: number) => {
    const notification = link.path === RoutePaths.servicemode;
    const isMapTab = link.path === RoutePaths.map;

    return (
      <Tooltip
        placement="right"
        slotProps={tooltipStyle}
        disableHoverListener={isCollapsed}
        title={isMapTab ? t('nav.mapShortcut') : t(link.nameKey)}
        key={link.path}>
        <NavLink
          key={`${link.path}-${forceUpdate}`}
          data-testid={testids.widget_navbar.NAVBAR_LINK[index]}
          className={({ isActive }) =>
            `${isCollapsed ? style.center : style.between} ${style.navLink} ${
              isActive ? style.active : ''
            } ${isMapTab ? style.secretTab : ''}`
          }
          to={link.path}
          onClick={isMobile ? () => resetStatusFilter() : undefined}
          end>
          {!isCollapsed && <span>{t(link.nameKey)}</span>}
          <div className={style.notificationsAnchor}>
            <span>{link.icon}</span>
            {notification && (
              <span className={style.notifications}>{length > 99 ? '99+' : length}</span>
            )}
          </div>
        </NavLink>
      </Tooltip>
    );
  };

  return (
    <>
      <div
        className={`${isCollapsed ? style.navBarCollops : style.navBarOpen} ${style.wrapper} ${
          isMobile || isTablet ? style.mobileNav : ''
        } ${theme.palette.mode === 'dark' ? style.rootDark : ''}`}>
        {!(isMobile || isTablet) && (
          <div className={`${style.logo} ${!isCollapsed && style.between}`}>
            <Link to={RoutePaths.events} onClick={handleLogoClick} className={style.logoLink}>
              <Logo className={style.img} />
            </Link>
            {!isCollapsed && (
              <span className={style.logoText}>{brandNameLabel(t, i18n.language)}</span>
            )}
          </div>
        )}

        <div className={`${isCollapsed ? style.navBarCollops : style.navBarOpen} ${style.navBar}`}>
          <div className={style.navBarWrapper}>
            <div className={style.branchSelectWrap}>
              <NavbarBranchSelect
                tooltipProps={{ slotProps: tooltipStyle, placement: 'right' }}
                isCollops={isCollapsed}
              />
            </div>

            {/* Место под стрелки всегда резервируем при нескольких страницах: иначе при появлении/исчезновении кнопки меняется высота списка, visibleItemsCount пересчитывается и slice() дублирует или пропускает пункты (дубль на границе страниц / пропадание «Рассылки»). */}
            {totalPages > 1 && (
              <div style={{ position: 'relative', height: '26px', marginBottom: '4px' }}>
                {canScrollUp ? (
                  <IconButton
                    className={style.carouselButtonTop}
                    onClick={handlePrev}
                    disabled={!canScrollUp || isAnimating}
                    size="small"
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}>
                    <KeyboardArrowUpIcon />
                  </IconButton>
                ) : (
                  <div aria-hidden style={{ height: 26 }} />
                )}
              </div>
            )}

            <div className={style.carouselContainerCompact}>
              <div className={style.carouselViewportCompact}>
                <div ref={carouselLinksMeasureRef} className={style.carouselLinksMeasure}>
                  <div
                    className={`${style.linksCompact} ${isAnimating ? style.animating : ''}`}
                    style={{
                      transition: isAnimating ? 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    }}>
                    {currentLinks.map((link, index) => {
                      const globalIndex = currentPage * itemsPerPage + index;
                      return renderNavLink(link, globalIndex);
                    })}
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className={style.carouselBottomReserve}>
                    {canScrollDown ? (
                      <IconButton
                        className={style.carouselButtonBottom}
                        onClick={handleNext}
                        disabled={!canScrollDown || isAnimating}
                        size="small">
                        <KeyboardArrowDownIcon />
                      </IconButton>
                    ) : (
                      <div className={style.carouselBottomPlaceholder} aria-hidden />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Параметры / назад (админ) + переключатель темы (десктопная колонка навбара) */}
            <div className={style.postLinksToolbar}>
              {isAdmin && (
                <Tooltip
                  title={sliderState ? t('nav.parameters') : t('nav.back')}
                  placement="right"
                  slotProps={tooltipStyle}
                  disableHoverListener={isCollapsed || isMobile || isTablet}>
                  <Button
                    onClick={handleSwitchChange}
                    className={style.settingsLink}
                    startIcon={sliderState ? <SettingsIcon /> : <ArrowBackIcon />}>
                    {!isCollapsed &&
                      !(isMobile || isTablet) &&
                      (sliderState ? t('nav.parameters') : t('nav.back'))}
                  </Button>
                </Tooltip>
              )}
            </div>

            {/* Версии (язык — в верхней панели контента, App.tsx) */}
            {!isCollapsed && !(isMobile || isTablet) && (
              <div className={style.versionContainer}>
                <div className={style.versionItem}>
                  <Typography variant="inherit" className={style.versionText}>
                    frontend: v {frontendVersion}
                  </Typography>
                </div>
                <div className={style.versionItem}>
                  <Typography variant="inherit" className={style.versionText}>
                    backend: v {backendVersion}
                  </Typography>
                </div>
              </div>
            )}
          </div>

          <div className={style.navBarBottom}>
            <Stack gap={1}>
              <MenuButton
                tooltipProps={{ slotProps: tooltipStyle, placement: 'right' }}
                collops={isCollapsed}
                email={email}
                close={close}
                toggleModal={toggle}
              />

              {!(isMobile || isTablet) && (
                <Button
                  onClick={handleCollops}
                  className={`${style.navBarButton} ${!isCollapsed && style.between}`}>
                  {!isCollapsed && (
                    <span className={`${isCollapsed && style.textCollops} ${style.text}`}>
                      {t('nav.hide')}
                    </span>
                  )}
                  <span className={`${isCollapsed && style.collops} ${style.openedCollops}`}>
                    <Tooltip title={isCollapsed ? t('nav.expand') : t('nav.collapse')}>
                      <ArrowBackIosNewOutlinedIcon
                        className={isCollapsed ? style.rotateIcon : ''}
                      />
                    </Tooltip>
                  </span>
                </Button>
              )}
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
