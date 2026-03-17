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
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import type { Values } from '@shared/ui/search_multiple_select';

import styles from './MapControls.module.scss';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

const Switch = ({ checked, onChange, label }: SwitchProps) => (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
    onClick={() => onChange(!checked)}>
    <div
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        backgroundColor: checked ? '#1976d2' : '#ccc',
        position: 'relative',
        transition: 'background-color 0.2s',
      }}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: 'white',
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          transition: 'left 0.2s',
        }}
      />
    </div>
    {label && <span style={{ fontSize: '14px' }}>{label}</span>}
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
}: MapControlsProps) => {
  const { t } = useTranslation();
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
  const fieldWidth = isCompact ? '100%' : 400;
  const minFieldWidth = isCompact ? undefined : 400;

  const filtersContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: isCompact ? 'column' : 'row',
        gap: '8px',
        flexWrap: isCompact ? 'nowrap' : 'wrap',
      }}>
      <div
        style={{
          width: fieldWidth,
          minWidth: minFieldWidth,
          flexShrink: 0,
        }}
        className={
          isCompact
            ? `${styles.mapControlsField} ${styles.mapControlsFieldCompact}`
            : styles.mapControlsField
        }>
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
      <div
        style={{
          width: fieldWidth,
          minWidth: minFieldWidth,
          flexShrink: 0,
        }}
        className={
          isCompact
            ? `${styles.mapControlsField} ${styles.mapControlsFieldCompact}`
            : styles.mapControlsField
        }>
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
      <div
        style={{
          width: fieldWidth,
          minWidth: minFieldWidth,
          flexShrink: 0,
        }}
        className={
          isCompact
            ? `${styles.mapControlsField} ${styles.mapControlsFieldCompact}`
            : styles.mapControlsField
        }>
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
        <div
          style={{
            width: fieldWidth,
            minWidth: minFieldWidth,
            flexShrink: 0,
          }}
          className={
            isCompact
              ? `${styles.mapControlsField} ${styles.mapControlsFieldCompact}`
              : styles.mapControlsField
          }>
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
      <ResetFilters
        title={t('common.resetFilters')}
        reset={() => {
          resetFilters();
          setLocationQuery('');
          onResetMapCenter?.();
          onFilterChange?.();
        }}
      />
    </div>
  );

  if (isCompact) {
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #ccc',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
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
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            backgroundColor: 'white',
          }}>
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
            style={{
              padding: '8px 12px 12px',
              borderTop: '1px solid #eee',
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
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#333',
                  marginBottom: '8px',
                }}>
                {t('common.filters')}
              </div>
            )}
            {filtersContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 50,
        width: 'fit-content',
        maxWidth: 'calc(100vw - 100px)',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
      {desktopToggles && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
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
                aria-label={t('map.resetMapCenter')}>
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
