import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, TextField, Typography } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';

import { useMailingsAddChangeForm } from '../hooks/useMailingsAddChangeForm';
import { EventTypeWithIntervals } from './EventTypeWithIntervals';

interface MailingsAddChangeFormProps {
  closeModal: () => void;
  id?: ID;
}

export const MailingsAddChangeForm: FC<MailingsAddChangeFormProps> = ({ closeModal, id }) => {
  const { t } = useTranslation();
  const {
    isLoading,
    handleSubmit,
    register,
    errorName,
    eventTypesWithIntervals,
    setEventTypesWithIntervals,
    eventTypeOptions,
    isEditMode,
    addEventType,
    removeEventType,
    validationErrors,
    hasMailingChanges,
  } = useMailingsAddChangeForm(id, closeModal);

  return (
    <Loader isLoading={isLoading}>
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: '600px' },
          overflowX: 'hidden',
          minWidth: 0,
        }}>
        <form onSubmit={handleSubmit}>
          <Typography fontWeight={600} marginBottom={2} variant="h6">
            {id ? t('modals.editMailing') : t('modals.addMailing')}
          </Typography>
          {isLoading ? null : (
            <>
              <InputsColumnWrapper>
                <TextField
                  data-testid={testids.page_roles.roles_popup_add_role.ROLES_ADD_ROLE_NAME}
                  helperText={
                    <span
                      style={{
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        display: 'inline-block',
                        maxWidth: '100%',
                      }}>
                      {errorName}
                    </span>
                  }
                  error={!!errorName}
                  {...register('name')}
                  label={t('form.enterEmail')}
                  disabled={isEditMode}
                  InputProps={{
                    readOnly: isEditMode,
                  }}
                  fullWidth
                  sx={{
                    width: '100%',
                    maxWidth: '100%',
                  }}
                />

                <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('form.eventTypesAndIntervals')}
                  </Typography>

                  {validationErrors.eventTypes && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors.eventTypes}
                    </Typography>
                  )}

                  {eventTypesWithIntervals.map((eventTypeData, index) => (
                    <EventTypeWithIntervals
                      key={eventTypeData.id}
                      eventTypeData={eventTypeData}
                      index={index}
                      eventTypeOptions={eventTypeOptions}
                      eventTypesWithIntervals={eventTypesWithIntervals}
                      onChange={setEventTypesWithIntervals}
                      onRemove={removeEventType}
                      showRemoveButton={eventTypesWithIntervals.length > 1}
                      errors={validationErrors.getEventTypeErrors(eventTypeData.id)}
                    />
                  ))}

                  <Button
                    onClick={addEventType}
                    variant="outlined"
                    sx={{
                      mt: 1,
                      color: '#000',
                      borderColor: '#000',
                      '&:hover': {
                        borderColor: '#000',
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                    disabled={eventTypeOptions.length === eventTypesWithIntervals.length}>
                    + {t('form.addEventType')}
                  </Button>
                </Box>
              </InputsColumnWrapper>
              <ButtonFormWrapper>
                <Button
                  testid={testids.POPUP_ACTION_BUTTON}
                  type="submit"
                  disabled={!hasMailingChanges}>
                  {id ? t('common.save') : t('common.add')}
                </Button>
                <Button testid={testids.POPUP_CANCEL_BUTTON} onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
              </ButtonFormWrapper>
            </>
          )}
        </form>
      </Box>
    </Loader>
  );
};
