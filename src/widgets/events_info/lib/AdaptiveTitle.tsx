// AdaptiveTitle.tsx
import React from 'react';

import { useMediaQuery, useTheme } from '@mui/material';

interface AdaptiveTitleProps {
  title: string;
}

export const AdaptiveTitle: React.FC<AdaptiveTitleProps> = ({ title }) => {
  const theme = useTheme();
  const isLessThan780 = useMediaQuery(theme.breakpoints.down(780));
  const isLessThan580 = useMediaQuery(theme.breakpoints.down(580));
  const isLessThan460 = useMediaQuery(theme.breakpoints.down(460));

  const getFontSize = () => {
    if (isLessThan460) return '10px';
    if (isLessThan580) return '12px';
    if (isLessThan780) return '14px';
    return '16px';
  };

  const getMarginLeft = () => {
    return isLessThan780 ? '3vw' : '6vw';
  };

  return (
    <div style={{ marginLeft: getMarginLeft() }}>
      <span
        style={{
          fontSize: getFontSize(),
          fontWeight: 'bold',
          padding: '4px 8px',
          display: 'block',
          whiteSpace: 'nowrap',
          transition: 'font-size 0.3s ease, margin-left 0.3s ease',
        }}>
        {title}
      </span>
    </div>
  );
};
