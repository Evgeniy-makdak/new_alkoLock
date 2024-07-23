import { Stack } from '@mui/material';

import { Image } from '@entities/image';
import { Info } from '@entities/info';
import { Loader } from '@shared/ui/loader';

import { useEventInfo } from '../hooks/useEventInfo';

interface EventInfo {
  selectedEventId: string | number;
}

export const EventInfo = ({ selectedEventId }: EventInfo) => {
  const { data, isLoading, fields } = useEventInfo(selectedEventId);
  return (
    <Loader isLoading={isLoading}>
      <Stack overflow={'auto'} padding={2}>
        {data?.summary?.photoFileName && (
          <Stack alignItems={'center'} justifyContent={'center'} minHeight={410}>
            <Image url={data.summary.photoFileName} />
          </Stack>
        )}
        <Info fields={fields} />
      </Stack>
    </Loader>
  );
};
