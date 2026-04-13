import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar, Stack, Tooltip } from '@mui/material';

import { Info } from '@entities/info';
import { ID } from '@shared/types/BaseQueryTypes';
import { ImagePreview } from '@shared/ui/image_preview/ui/ImagePreview';
import { IMAGE_PREVIEW_WRAPPER_STYLE } from '@shared/ui/image_view';
import { Loader } from '@shared/ui/loader';

import { useUserInfo } from '../hooks/useUserInfo';
import style from './UserInfo.module.scss';

type UserInfoProps = {
  selectedUserId: ID;
  closeTab: () => void;
};

export const UserInfo: FC<UserInfoProps> = ({ selectedUserId, closeTab }) => {
  const { t } = useTranslation();
  const { fields, isLoading, src, open, toggle, firstLetter } = useUserInfo(
    selectedUserId,
    closeTab,
  );

  return (
    <Loader isLoading={isLoading}>
      <Stack className={style.infoContainer}>
        <Info
          fields={fields}
          headerCard={
            <Stack marginBottom={2} alignItems={'center'} justifyContent={'center'}>
              {src ? (
                <Tooltip
                  title={t('tooltips.viewPhoto')}
                  PopperProps={{
                    modifiers: [
                      {
                        name: 'preventOverflow',
                        options: {
                          boundary: 'window',
                        },
                      },
                      {
                        name: 'offset',
                        options: {
                          offset: [0, -40],
                        },
                      },
                    ],
                  }}>
                  <Avatar
                    onClick={toggle}
                    className={`${style.avatar} ${style.paper} ${IMAGE_PREVIEW_WRAPPER_STYLE}`}>
                    <img src={src} />
                    <ImagePreview src={src} open={open} close={toggle} />
                  </Avatar>
                </Tooltip>
              ) : (
                <Avatar className={style.avatar}>{firstLetter}</Avatar>
              )}
            </Stack>
          }
        />
      </Stack>
    </Loader>
  );
};
