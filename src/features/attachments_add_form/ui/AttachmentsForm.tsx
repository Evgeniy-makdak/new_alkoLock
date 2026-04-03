import { useTranslation } from 'react-i18next';

import { CarsSelect } from '@entities/cars_select';
import { UsersSelectForPost } from '@entities/users_select/ui/UserSelectForPost';
import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import { Button } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';

import { useAttachmentsForm } from '../hooks/useAttachmentsForm';
import style from './AttachmentsForm.module.scss';

interface AttachmentAddFormProps {
  onClose: () => void;
  specified?: boolean;
}

export const AttachmentAddForm = ({ onClose }: AttachmentAddFormProps) => {
  const { t } = useTranslation();
  const { carId, driverId, onSelect, onAddAtachment, errorCar, errorDriver, isDirty } =
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
          label={t('form.vehicleShort')}
          value={carId}
          setValueStore={onSelect}
          specified={true}
        />
        {errorCar && <span className={style.errorText}>{t('validation.required')}</span>}{' '}
        <UsersSelectForPost
          needDriverId={true}
          excludeDisabledUsers={false}
          excludeUserWithId2={true} // Во вкладке Привязки в окне Привязка алкозамка
          onlyWithDriverId={true} // При false отображает только водителей.
          isAttachment={true} // модалка «Привязка»: только активные пользователи (full-name)
          value={driverId}
          setValueStore={onSelect}
          testid={
            testids.page_attachments.attachments_popup_add_attach.ATTACHMENTS_ADD_ATTACH_INPUT_USER
          }
          error={errorDriver}
          label={t('form.driver')}
          name="driverId"
          useUserAttachSort={true}
        />
        {errorDriver && <span className={style.errorText}>{t('validation.required')}</span>}{' '}
      </InputsColumnWrapper>
      <ButtonFormWrapper>
        <Button
          testid={`${testids.POPUP_ACTION_BUTTON}_${testids.page_attachments.attachments_popup_add_attach.ATTACHMENTS_ADD_ATTACH}`}
          onClick={onAddAtachment}
          disabled={!isDirty}>
          {t('common.add')}
        </Button>
        <Button
          testid={`${testids.POPUP_CANCEL_BUTTON}_${testids.page_attachments.attachments_popup_add_attach.ATTACHMENTS_ADD_ATTACH}`}
          onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </ButtonFormWrapper>
    </Loader>
  );
};
