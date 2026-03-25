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
          px: 1,
          py: 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}>
        <TextField
          variant="outlined"
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          fullWidth
          sx={{ minWidth: 0 }}
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
                flexShrink: 0,
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
              }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minHeight: 48,
        mb: 3,
      }}>
      <TextField
        variant="outlined"
        placeholder={t('common.search')}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        fullWidth
        sx={{
          flex: 1,
          minWidth: 0,
          maxWidth: { xs: '100%', md: 'calc(100% - 132px)' },
        }}
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
    </Box>
  );
};

export default EmailTemplatesSearch;
