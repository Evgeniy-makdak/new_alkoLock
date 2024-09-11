import { FC, useEffect } from 'react';

import { Avatar, Stack } from '@mui/material';

import { Info } from '@entities/info';
import { ID } from '@shared/types/BaseQueryTypes';
import { ImagePreview } from '@shared/ui/image_preview/ui/ImagePreview';
import { IMAGE_PREVIEW_WRAPPER_STYLE } from '@shared/ui/image_view';
import { Loader } from '@shared/ui/loader';
import { useUserContext } from '@widgets/users_info/UserContext';

import { useUserInfo } from '../hooks/useUserInfo';
import style from './UserInfo.module.scss';

type UserInfoProps = {
  selectedUserId: ID;
  closeTab: () => void;
};

export const UserInfo: FC<UserInfoProps> = ({ selectedUserId, closeTab }) => {
  const { fields, isLoading, src, open, toggle, firstLetter } = useUserInfo(
    selectedUserId,
    closeTab,
  );
  const { setSelectedUserId } = useUserContext(); 

  useEffect(() => {
    setSelectedUserId(selectedUserId); 
  }, [selectedUserId, setSelectedUserId]);

  return (
    <Loader isLoading={isLoading}>
      <Stack maxWidth={'580px'} padding={2}>
        <Info
          fields={fields}
          headerCard={
            <Stack marginBottom={3} alignItems={'center'} justifyContent={'center'}>
              <Avatar
                onClick={toggle}
                className={`${style.avatar} ${src && style.paper} ${src && IMAGE_PREVIEW_WRAPPER_STYLE}`}>
                {src ? <img src={src} /> : firstLetter}
                {src && <ImagePreview src={src} open={open} close={toggle} />}
              </Avatar>
            </Stack>
          }
        />
      </Stack>
    </Loader>
  );
};
