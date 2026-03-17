import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, InputAdornment, TextField, Tooltip, useMediaQuery } from '@mui/material';

interface EmailTemplatesSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddClick?: () => void;
}

const EmailTemplatesSearch: React.FC<EmailTemplatesSearchProps> = ({
  searchQuery,
  onSearchChange,
  onAddClick,
}) => {
  const { t } = useTranslation();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width:768px)');

  const handleTooltipOpen = (key: string) => setActiveTooltip(key);
  const handleTooltipClose = () => setActiveTooltip(null);

  if (isMobile) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'white',
        }}>
        <TextField
          variant="outlined"
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <Tooltip
                  title={t('map.clear')}
                  open={activeTooltip === 'clear'}
                  onOpen={() => handleTooltipOpen('clear')}
                  onClose={handleTooltipClose}
                  disableInteractive>
                  <IconButton onClick={() => onSearchChange('')} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : undefined,
          }}
        />

        {onAddClick && (
          <Tooltip title={t('common.addTemplate')}>
            <IconButton
              onClick={onAddClick}
              sx={{
                backgroundColor: '#f5f5f5',
                '&:hover': {
                  backgroundColor: '#e0e0e0',
                },
                flexShrink: 0,
              }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <TextField
      variant="outlined"
      placeholder={t('common.search')}
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      size="small"
      fullWidth
      sx={{ mb: 3 }}
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
              <IconButton onClick={() => onSearchChange('')}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default EmailTemplatesSearch;
