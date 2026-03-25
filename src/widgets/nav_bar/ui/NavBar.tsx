import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
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
import { useColorMode } from '@shared/theme/colorMode';
import { AppLanguageSelect } from '@shared/ui/app_language_select';
import { Popup } from '@shared/ui/popup';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { breakpoints } from '../breakpoints';
import { NAV_LINKS, frontendVersion } from '../config/const';
import { tooltipStyle } from '../config/styles';
import { useNavBar } from '../hooks/useNavBar';
import style from './NavBar.module.scss';

// Высота одного элемента навигации в пикселях (с учетом margin-bottom)
const ITEM_HEIGHT = 61; // 44px высота + 17px margin-bottom

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
  const { mode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [forceUpdate, setForceUpdate] = useState(false);
  const [showMapTab, setShowMapTab] = useState(true);

  // Состояние для карусели
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleItemsCount, setVisibleItemsCount] = useState(8);
  const [isAnimating, setIsAnimating] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
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

      if (sliderState && (link.path === RoutePaths.messages || link.path === RoutePaths.settings)) {
        return false;
      }

      if (!sliderState && link.path !== RoutePaths.messages && link.path !== RoutePaths.settings) {
        return false;
      }

      return true;
    });
  }, [permissionsFilter, sliderState, showMapTab]);

  const filteredLinks = getFilteredLinks();

  // Расчет количества видимых элементов и страниц
  const calculateVisibleItems = useCallback(() => {
    if (!carouselRef.current) {
      return { visibleCount: filteredLinks.length, totalPages: 1 };
    }

    try {
      const containerHeight = carouselRef.current.clientHeight;
      const availableHeight = containerHeight - 20;
      const visibleCount = Math.floor(availableHeight / ITEM_HEIGHT);
      const totalPages = Math.ceil(filteredLinks.length / visibleCount);

      return { visibleCount, totalPages };
    } catch (error) {
      return { visibleCount: filteredLinks.length, totalPages: 1 };
    }
  }, [filteredLinks.length]);

  // Получение текущих ссылок для отображения
  const getCurrentLinks = useCallback(() => {
    const { visibleCount } = calculateVisibleItems();
    const startIndex = currentPage * visibleCount;
    const endIndex = startIndex + visibleCount;
    return filteredLinks.slice(startIndex, endIndex);
  }, [currentPage, filteredLinks, calculateVisibleItems]);

  useEffect(() => {
    const { visibleCount, totalPages } = calculateVisibleItems();
    setVisibleItemsCount(visibleCount);

    // Корректируем текущую страницу, если она выходит за границы
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [calculateVisibleItems, currentPage]);

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
          : RoutePaths.messages,
    );
  };

  useEffect(() => {
    if (location.pathname === RoutePaths.messages) {
      setSliderState(false);
    } else if (location.pathname === RoutePaths.settings) {
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

  // Обновление при изменении размеров
  useEffect(() => {
    const updateCarousel = () => {
      const { visibleCount, totalPages } = calculateVisibleItems();
      setVisibleItemsCount(visibleCount);

      if (currentPage >= totalPages) {
        setCurrentPage(Math.max(0, totalPages - 1));
      }
    };

    if (carouselRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        updateCarousel();
      });

      resizeObserverRef.current.observe(carouselRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [calculateVisibleItems, currentPage]);

  // Обработчики для страничной навигации
  const handleNext = () => {
    if (isAnimating) return;

    const { totalPages } = calculateVisibleItems();
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

  const { totalPages } = calculateVisibleItems();
  const currentLinks = getCurrentLinks();
  const canScrollUp = currentPage > 0;
  const canScrollDown = currentPage < totalPages - 1;

  const renderNavLink = (link: (typeof NAV_LINKS)[0], index: number) => {
    const notification = link.path === RoutePaths.autoService;
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
          <div style={{ position: 'relative', display: 'inline-flex' }}>
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
            <NavbarBranchSelect
              tooltipProps={{ slotProps: tooltipStyle, placement: 'right' }}
              isCollops={isCollapsed}
            />

            {/* ВЫНОСИМ КНОПКУ ВВЕРХ НА УРОВЕНЬ ВЫШЕ */}
            {totalPages > 1 && canScrollUp && (
              <div style={{ position: 'relative', height: '30px', marginBottom: '5px' }}>
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
              </div>
            )}

            <div className={style.carouselContainerCompact} ref={carouselRef}>
              <div className={style.carouselViewportCompact}>
                <div
                  className={`${style.linksCompact} ${isAnimating ? style.animating : ''}`}
                  style={{
                    transition: isAnimating ? 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                  }}>
                  {currentLinks.map((link, index) => {
                    const globalIndex = currentPage * visibleItemsCount + index;
                    return renderNavLink(link, globalIndex);
                  })}
                </div>

                {totalPages > 1 && canScrollDown && (
                  <IconButton
                    className={style.carouselButtonBottom}
                    onClick={handleNext}
                    disabled={!canScrollDown || isAnimating}
                    size="small">
                    <KeyboardArrowDownIcon />
                  </IconButton>
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
              {!(isMobile || isTablet) && (
                <Tooltip
                  title={t('nav.toggleColorMode')}
                  placement="right"
                  slotProps={tooltipStyle}
                  disableHoverListener={isCollapsed}>
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={toggleColorMode}
                    className={style.themeIconBtn}
                    aria-label={t('nav.toggleColorMode')}>
                    {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
                  </IconButton>
                </Tooltip>
              )}
            </div>

            {/* Версии и переключатель языка */}
            {!isCollapsed && !(isMobile || isTablet) && (
              <div className={style.versionContainer}>
                <AppLanguageSelect
                  className={style.languageSwitcher}
                  formControlClassName={style.langSelect}
                  showLanguageName
                />

                <div className={style.versionItem}>
                  <Typography variant="inherit" className={style.versionText}>
                    {t('nav.frontend')}: v {frontendVersion}
                  </Typography>
                </div>
                <div className={style.versionItem}>
                  <Typography variant="inherit" className={style.versionText}>
                    {t('nav.backend')}: v {backendVersion}
                  </Typography>
                </div>
              </div>
            )}
          </div>

          <div className={style.navBarBottom}>
            <Stack gap={1}>
              {(isMobile || isTablet) && (
                <div className={style.mobileLanguageWrap}>
                  <AppLanguageSelect
                    className={style.languageSwitcherMobile}
                    formControlClassName={style.langSelectMobile}
                    size="small"
                  />
                  <Tooltip title={t('nav.toggleColorMode')} placement="top">
                    <IconButton
                      size="small"
                      color="inherit"
                      onClick={toggleColorMode}
                      className={style.themeIconBtnMobile}
                      aria-label={t('nav.toggleColorMode')}>
                      {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
                    </IconButton>
                  </Tooltip>
                </div>
              )}
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
