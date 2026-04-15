/* eslint-disable react-hooks/exhaustive-deps */
import { type FC } from 'react';

import { useMediaQuery } from '@mui/material';

import { MailingsDesktopTable } from './MailingsDesktopTable';
import { MailingsMobileTable } from './MailingsMobileTable';

type MailingsTableProps = {
  onBranchChange: () => void;
};

export const MailingsTable: FC<MailingsTableProps> = ({ onBranchChange }) => {
  const isMobile = useMediaQuery('(max-width:768px)', { noSsr: true });

  if (isMobile) {
    return <MailingsMobileTable onBranchChange={onBranchChange} />;
  }

  return <MailingsDesktopTable onBranchChange={onBranchChange} />;
};
