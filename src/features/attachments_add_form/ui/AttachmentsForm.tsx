import { CarsSelect } from '@entities/cars_select';
import { UsersSelect } from '@entities/users_select';
import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { Button } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';

import { useAttachmentsForm } from '../hooks/useAttachmentsForm';

interface AttachmentAddFormProps {
  onClose: () => void;
}

export const AttachmentAddForm = ({ onClose }: AttachmentAddFormProps) => {
  const { carId, driverId, onSelect, onAddAtachment, errorCar, errorDriver } =
    useAttachmentsForm(onClose);
  return (
    <Loader>
      <InputsColumnWrapper>
        <CarsSelect
          name="carId"
          testid={
            testids.page_attachments.attachments_popup_add_attach.ATTACHMENTS_ADD_ATTACH_INPUT_CAR
          }
          error={errorCar}
          label="TC"
          value={carId}
          setValueStore={onSelect}
        />

        <UsersSelect
          needDriverId={true}
          value={driverId}
          setValueStore={onSelect}
          testid={
            testids.page_attachments.attachments_popup_add_attach.ATTACHMENTS_ADD_ATTACH_INPUT_USER
          }
          error={errorDriver}
          label="Водитель"
          name="driverId"
        />
      </InputsColumnWrapper>
      <ButtonFormWrapper>
        <Button
          testid={`${testids.POPUP_ACTION_BUTTON}_${testids.page_attachments.attachments_popup_add_attach.ATTACHMENTS_ADD_ATTACH}`}
          onClick={onAddAtachment}>
          добавить
        </Button>
        <Button
          testid={`${testids.POPUP_CANCEL_BUTTON}_${testids.page_attachments.attachments_popup_add_attach.ATTACHMENTS_ADD_ATTACH}`}
          onClick={onClose}>
          отмена
        </Button>
      </ButtonFormWrapper>
    </Loader>
  );
};
