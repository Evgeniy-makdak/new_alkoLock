import React from 'react';

import { useMediaQuery } from '@mui/material';

import { SettingsDesktopTable } from './SettingsDesktopTable';
import { SettingsMobileTable } from './SettingsMobileTable';

interface SettingRow {
  id: number;
  label: string;
  field: string;
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

interface SettingsTableProps {
  loading: boolean;
  settingsRows: SettingRow[];
  page: number;
  rowsPerPage: number;
  getUnitDisplay: (unit: string, value: number) => string;
  handleEditClick: (row: SettingRow) => void;
  handleResetToDefault: (row: SettingRow) => void;
}

export const SettingsTable: React.FC<SettingsTableProps> = (props) => {
  const isMobile = useMediaQuery('(max-width:768px)', { noSsr: true });

  if (isMobile) {
    return <SettingsMobileTable {...props} />;
  }

  return <SettingsDesktopTable {...props} />;
};
