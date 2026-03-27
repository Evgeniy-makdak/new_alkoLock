import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ClearIcon from '@mui/icons-material/Clear';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import SearchIcon from '@mui/icons-material/Search';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';

import { AlcolockSelect } from '@entities/alcolock_select';
import { CarsSelect } from '@entities/cars_select';
import { UsersSelect } from '@entities/users_select';
import { useMapFilterPanel } from '@features/map_filter_panel/hooks/useMapFilterPanel';
import type { MapFilters } from '@features/map_filter_panel/model/mapFilterPanelStore';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
import { ThemeToggleControl, useColorMode } from '@shared/theme/colorMode';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import type { Values } from '@shared/ui/search_multiple_select';

import styles from './MapControls.module.scss';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

const Switch = ({ checked, onChange, label }: SwitchProps) => (
  <div className={styles.mapSwitch} onClick={() => onChange(!checked)}>
    <div
      className={`${styles.mapSwitchTrack} ${checked ? styles.mapSwitchTrackOn : styles.mapSwitchTrackOff}`}>
      <div className={`${styles.mapSwitchThumb} ${checked ? styles.mapSwitchThumbChecked : ''}`} />
    </div>
    {label && <span className={styles.mapSwitchLabel}>{label}</span>}
  </div>
);

type MapControlsProps = {
  onFilterChange?: () => void;
  onResetMapCenter?: () => void;
  onLocationSearch?: (query: string) => void | Promise<void>;
  isMobile?: boolean;
  compact?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  mobileToggles?: {
    freezeMarkers: boolean;
    showOnlyWithAlcolock: boolean;
    numberedMarkersMode: boolean;
    onFreezeToggle: (v: boolean) => void;
    onShowOnlyWithAlcolock: (v: boolean) => void;
    onNumberedMarkersMode: (v: boolean) => void;
  };
  desktopToggles?: {
    freezeMarkers: boolean;
    showOnlyWithAlcolock: boolean;
    numberedMarkersMode: boolean;
    onFreezeToggle: (v: boolean) => void;
    onShowOnlyWithAlcolock: (v: boolean) => void;
    onNumberedMarkersMode: (v: boolean) => void;
  };
  /** Desktop: полоса фильтров как на вкладках с таблицами (FilterPanel) */
  variant?: 'toolbar';
};

export const MapControls = ({
  onFilterChange,
  onResetMapCenter,
  onLocationSearch,
  isMobile,
  compact,
  onExpandedChange,
  mobileToggles,
  desktopToggles,
  variant,
}: MapControlsProps) => {
  const { t } = useTranslation();
  const { mode } = useColorMode();
  const { filters, setFilters, resetFilters } = useMapFilterPanel();
  const branchId = appStore((state) => state.selectedBranchState?.id);
  const [expanded, setExpanded] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);

  const handleToggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    onExpandedChange?.(next);
  };
  const handleFilterChange = (name: keyof MapFilters, value: any) => {
    setFilters(name, value);
    onFilterChange?.();
  };

  const handleLocationSearch = async () => {
    const q = locationQuery.trim();
    if (!q || !onLocationSearch) return;
    setLocationSearching(true);
    try {
      await onLocationSearch(q);
    } finally {
      setLocationSearching(false);
    }
  };

  const isCompact = isMobile || compact;
  const isToolbar = Boolean(variant === 'toolbar' && !isCompact);

  const fieldWrapClass = isCompact
    ? `${styles.mapControlsField} ${styles.mapControlsFieldCompact}`
    : isToolbar
      ? `${styles.mapControlsField} ${styles.mapControlsFieldToolbar}`
      : styles.mapControlsField;

  const fieldWrapStyle =
    isCompact || isToolbar
      ? undefined
      : {
          width: 400,
          minWidth: 400,
          flexShrink: 0,
        };

  const handleResetFilters = () => {
    resetFilters();
    setLocationQuery('');
    onResetMapCenter?.();
    onFilterChange?.();
  };

  const filterFields = (
    <>
      <div style={fieldWrapStyle} className={fieldWrapClass}>
        <UsersSelect
          multiple
          excludeDisabledUsers={false}
          excludeUserWithId2={false}
          onlyWithDriverId={false}
          needDriverId
          includeActiveOnly
          name="driverId"
          setValueStore={(name: string, value: any) =>
            handleFilterChange(name as keyof MapFilters, value)
          }
          value={(filters.driverId || []) as Values}
          testid={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FILTER_INPUT_DRIVER}
          label={t('map.searchByUser')}
        />
      </div>
      <div style={fieldWrapStyle} className={fieldWrapClass}>
        <CarsSelect
          multiple
          name="carId"
          branchId={branchId}
          includeIsActive
          testid={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_CAR
          }
          setValueStore={handleFilterChange}
          value={(filters.carId || []) as Values}
          label={t('map.searchByVehicle')}
        />
      </div>
      <div style={fieldWrapStyle} className={fieldWrapClass}>
        <AlcolockSelect
          multiple
          label={t('map.searchByAlcolock')}
          setValueStore={handleFilterChange}
          value={(filters.alcolocks || []) as Values}
          branchId={branchId}
          testid={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_FILTER_INPUT_ALCOLOKS
          }
          name="alcolocks"
        />
      </div>
      {onLocationSearch && (
        <div style={fieldWrapStyle} className={fieldWrapClass}>
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            label={t('map.searchByCity')}
            placeholder={t('map.searchPlaceholder')}
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLocationSearch();
              }
            }}
            disabled={locationSearching}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {locationQuery && (
                    <Tooltip title={t('map.clear')}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setLocationQuery('');
                          onResetMapCenter?.();
                        }}
                        disabled={locationSearching}
                        aria-label={t('map.clear')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={t('map.findOnMap')}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleLocationSearch}
                        disabled={locationSearching || !locationQuery.trim()}
                        aria-label={t('map.findOnMap')}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </div>
      )}
    </>
  );

  const filtersContent = isToolbar ? (
    <div className={styles.mapControlsFiltersRow}>
      <div className={styles.mapControlsFields}>{filterFields}</div>
      <div className={styles.mapControlsReset}>
        <ResetFilters reset={handleResetFilters} />
        <ThemeToggleControl />
      </div>
    </div>
  ) : (
    <div
      style={{
        display: 'flex',
        flexDirection: isCompact ? 'column' : 'row',
        gap: '8px',
        flexWrap: isCompact ? 'nowrap' : 'wrap',
      }}>
      {filterFields}
      <ResetFilters reset={handleResetFilters} />
    </div>
  );

  if (isCompact) {
    const sheetClass =
      mode === 'dark'
        ? `${styles.mapControlsMobileSheet} ${styles.mapControlsMobileSheetDark}`
        : `${styles.mapControlsMobileSheet} ${styles.mapControlsMobileSheetLight}`;
    const headerClass =
      mode === 'dark'
        ? `${styles.mapControlsMobileHeader} ${styles.mapControlsMobileHeaderDark}`
        : `${styles.mapControlsMobileHeader} ${styles.mapControlsMobileHeaderLight}`;
    const bodyClass =
      mode === 'dark' ? styles.mapControlsMobileBodyDark : styles.mapControlsMobileBodyLight;
    const headingClass =
      mode === 'dark'
        ? styles.mapControlsMobileFiltersHeadingDark
        : styles.mapControlsMobileFiltersHeadingLight;
    const borderTop = mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #eee';

    return (
      <div className={sheetClass}>
        <div
          onClick={handleToggleExpanded}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleExpanded();
            }
          }}
          className={headerClass}>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('nav.parameters')}</span>
          <span
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}>
            ▼
          </span>
        </div>
        {expanded && (
          <div
            className={bodyClass}
            style={{
              padding: '8px 12px 12px',
              borderTop,
              maxHeight: '50vh',
              overflowY: 'auto',
            }}>
            {mobileToggles && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                <Switch
                  checked={mobileToggles.freezeMarkers}
                  onChange={mobileToggles.onFreezeToggle}
                  label={t('map.pinMarkers')}
                />
                <Switch
                  checked={mobileToggles.showOnlyWithAlcolock}
                  onChange={mobileToggles.onShowOnlyWithAlcolock}
                  label={t('map.onlyWithAlcolock')}
                />
                <Switch
                  checked={mobileToggles.numberedMarkersMode}
                  onChange={mobileToggles.onNumberedMarkersMode}
                  label={t('map.showAsList')}
                />
                {onResetMapCenter && (
                  <Tooltip title={t('map.resetMapCenter')}>
                    <IconButton
                      size="small"
                      onClick={onResetMapCenter}
                      aria-label={t('map.resetMapCenter')}>
                      <GpsFixedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            )}
            {mobileToggles && (
              <div
                className={headingClass}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}>
                {t('common.filters')}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filterFields}
              <ResetFilters reset={handleResetFilters} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.mapControlsToolbar}>
      {desktopToggles && (
        <div className={styles.mapControlsTogglesRow}>
          <Switch
            checked={desktopToggles.freezeMarkers}
            onChange={desktopToggles.onFreezeToggle}
            label={t('map.pinMarkers')}
          />
          <Switch
            checked={desktopToggles.showOnlyWithAlcolock}
            onChange={desktopToggles.onShowOnlyWithAlcolock}
            label={t('map.onlyWithAlcolock')}
          />
          <Switch
            checked={desktopToggles.numberedMarkersMode}
            onChange={desktopToggles.onNumberedMarkersMode}
            label={t('map.showAsList')}
          />
          {onResetMapCenter && (
            <Tooltip title={t('map.resetMapCenter')}>
              <IconButton
                size="small"
                onClick={onResetMapCenter}
                aria-label={t('map.resetMapCenter')}
                color="inherit">
                <GpsFixedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      )}
      {filtersContent}
    </div>
  );
};
