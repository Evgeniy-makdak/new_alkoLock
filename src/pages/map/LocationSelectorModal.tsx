import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    region?: string;
    country?: string;
    country_code?: string;
  };
}

interface LocationSelectorModalProps {
  open: boolean;
  onClose: () => void;
  results: NominatimResult[];
  query: string;
  onSelect: (lat: number, lon: number) => void;
}

const formatLocationInfo = (item: NominatimResult): string => {
  const parts: string[] = [];
  const addr = item.address;
  if (addr) {
    const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality;
    if (city) parts.push(city);
    const region = addr.state ?? addr.region;
    if (region) parts.push(region);
    if (addr.country) parts.push(addr.country);
  }
  if (parts.length > 0) return parts.join(', ');
  return item.display_name;
};

export const LocationSelectorModal: FC<LocationSelectorModalProps> = ({
  open,
  onClose,
  results,
  query,
  onSelect,
}) => {
  const { t } = useTranslation();

  const handleSelect = (item: NominatimResult) => {
    onSelect(parseFloat(item.lat), parseFloat(item.lon));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
        },
      }}>
      <DialogTitle sx={{ pb: 0 }}>
        {t('map.locationSelectorTitle')}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          {t('map.locationSelectorSubtitle', { query })}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        <List disablePadding>
          {results.map((item) => (
            <ListItemButton
              key={item.place_id}
              onClick={() => handleSelect(item)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LocationOnIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.display_name}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {formatLocationInfo(item)}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      display="block"
                      color="text.disabled"
                      sx={{ mt: 0.25 }}>
                      {t('info.coordinates')}: {parseFloat(item.lat).toFixed(4)},{' '}
                      {parseFloat(item.lon).toFixed(4)}
                    </Typography>
                  </>
                }
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};
