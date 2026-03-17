/* eslint-disable react-hooks/exhaustive-deps */
import { useMediaQuery } from '@mui/material';

import { AttachmentsDesktopTable } from './AttachmentsDesktopTable';
import { AttachmentsMobileTable } from './AttachmentsMobileTable';

interface AttachmentsTableProps {
  onBranchChange: () => void;
  prevBranch?: any;
}

export const AttachmentsTable = ({ onBranchChange, prevBranch }: AttachmentsTableProps) => {
  const isMobile = useMediaQuery('(max-width:768px)');

  if (isMobile) {
    return <AttachmentsMobileTable onBranchChange={onBranchChange} prevBranch={prevBranch} />;
  }

  return <AttachmentsDesktopTable onBranchChange={onBranchChange} prevBranch={prevBranch} />;
};
