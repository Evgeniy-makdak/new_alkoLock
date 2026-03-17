import { FC } from 'react';

import { Close } from '@mui/icons-material';
import { Box, IconButton } from '@mui/material';

import { RoleViewForm } from './RoleViewForm';

interface RoleViewModalProps {
  role: any;
  open: boolean;
  onClose: () => void;
}

export const RoleViewModal: FC<RoleViewModalProps> = ({ role, open, onClose }) => {
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
          background: 'white',
          borderRadius: 2,
          width: '100%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
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
            borderBottom: '1px solid #e0e0e0',
            background: '#f8f9fa',
          }}>
          <IconButton
            onClick={onClose}
            aria-label="Закрыть"
            sx={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#777',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                color: '#333',
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
