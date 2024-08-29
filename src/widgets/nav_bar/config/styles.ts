import { type TooltipProps, tooltipClasses } from '@mui/material/Tooltip';

export const tooltipStyle: TooltipProps['slotProps'] = {
  popper: {
    sx: {
      [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]: {
        marginTop: '5px',
        fontSize: '15px',
      },
      [`&.${tooltipClasses.popper}[data-popper-placement*="top"] .${tooltipClasses.tooltip}`]: {
        marginBottom: '5px',
        fontSize: '15px',
      },
      [`&.${tooltipClasses.popper}[data-popper-placement*="right"] .${tooltipClasses.tooltip}`]: {
        marginLeft: '5px',
        fontSize: '15px',
      },
      [`&.${tooltipClasses.popper}[data-popper-placement*="left"] .${tooltipClasses.tooltip}`]: {
        marginRight: '5px',
        fontSize: '15px',
      },
    },
  },
};
