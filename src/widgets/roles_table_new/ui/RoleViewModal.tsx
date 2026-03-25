import { FC } from 'react';

import { Close } from '@mui/icons-material';
import { Box, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { RoleViewForm } from './RoleViewForm';

interface RoleViewModalProps {
  role: any;
  open: boolean;
  onClose: () => void;
}

export const RoleViewModal: FC<RoleViewModalProps> = ({ role, open, onClose }) => {
  const theme = useTheme();

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        p: 2,
        '@media (max-width: 480px)': {
          p: 1,
        },
      }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderRadius: 2,
          width: '100%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.55)'
              : '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid',
          borderColor: 'divider',
          '@media (max-width: 480px)': {
            maxHeight: '95vh',
          },
        }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}>
          <IconButton
            onClick={onClose}
            aria-label="Закрыть"
            sx={{
              color: 'text.secondary',
              width: 32,
              height: 32,
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'action.selected',
              },
            }}>
            <Close />
          </IconButton>
        </Box>

        <Box
          sx={{
            p: 2,
          }}>
          <RoleViewForm closeModal={onClose} id={role.id} />
        </Box>
      </Box>
    </Box>
  );
};
