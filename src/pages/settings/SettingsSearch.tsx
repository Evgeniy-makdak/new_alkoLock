import React from 'react';
import { useTranslation } from 'react-i18next';

import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';

interface SettingsSearchProps {
  searchQuery: string;
  activeTooltip: string | null;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  handleTooltipOpen: (key: string) => void;
  handleTooltipClose: () => void;
}

export const SettingsSearch: React.FC<SettingsSearchProps> = ({
  searchQuery,
  activeTooltip,
  setSearchQuery,
  setPage,
  handleTooltipOpen,
  handleTooltipClose,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 2 }}>
      <TextField
        variant="outlined"
        placeholder={t('common.search')}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setPage(0);
        }}
        size="small"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip
                title={t('map.clear')}
                open={activeTooltip === 'clear'}
                onOpen={() => handleTooltipOpen('clear')}
                onClose={handleTooltipClose}
                disableInteractive>
                <IconButton onClick={() => setSearchQuery('')} size="small">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};
