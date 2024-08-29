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
  const handleDelete = useAttachmentDeleteForm(attach.id, closeModal);
  return (
    <div>
      <Typography marginBottom={2} fontWeight={700} variant="h6">
        Удаление привязки Алкозамка
      </Typography>
      <Stack gap={2}>
        <Typography>
          Вы действительно хотите удалить привязку <b>{attach.text}?</b>
        </Typography>
        <ButtonFormWrapper>
          <Button
            testid={`${testids.POPUP_ACTION_BUTTON}_${testids.page_attachments.attachments_popup_delete_attach.ATTACHMENTS_DELETE_ATTACH}`}
            onClick={handleDelete}>
            удалить
          </Button>
          <Button
            testid={`${testids.POPUP_CANCEL_BUTTON}_${testids.page_attachments.attachments_popup_delete_attach.ATTACHMENTS_DELETE_ATTACH}`}
            onClick={closeModal}>
            отмена
          </Button>
        </ButtonFormWrapper>
      </Stack>
    </div>
  );
};
