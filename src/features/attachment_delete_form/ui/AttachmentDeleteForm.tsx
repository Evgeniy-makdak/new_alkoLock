import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';

import { useAttachmentDeleteForm } from '../hooks/useAttachmentDeleteForm';

interface AttachmentDeleteFormProps {
  attach: { id: ID; text: string };
  closeModal: () => void;
}

export const AttachmentDeleteForm = ({ attach, closeModal }: AttachmentDeleteFormProps) => {
  const { t } = useTranslation();
  const handleDelete = useAttachmentDeleteForm(attach.id, closeModal);
  return (
    <div>
      <Typography marginBottom={2} fontWeight={700} variant="h6">
        {t('modals.attachmentDeletion')}
      </Typography>
      <Stack gap={2}>
        <Typography>{t('modals.confirmDeleteAttachment', { name: attach.text })}</Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}_${testids.page_attachments.attachments_popup_delete_attach.ATTACHMENTS_DELETE_ATTACH}`}
            onClick={handleDelete}>
            {t('modals.delete')}
          </Button>
          <Button
            testid={`${testids.POPUP_CANCEL_BUTTON}_${testids.page_attachments.attachments_popup_delete_attach.ATTACHMENTS_DELETE_ATTACH}`}
            onClick={closeModal}>
            {t('modals.cancel')}
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </div>
  );
};
