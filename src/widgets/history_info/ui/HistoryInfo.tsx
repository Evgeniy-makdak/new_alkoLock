import { Stack } from '@mui/material';

import { Image } from '@entities/image';
import { Info } from '@entities/info';
import { Loader } from '@shared/ui/loader';

import { useHistoryInfo } from '../hooks/useHistoryInfo';

interface HistoryInfo {
  selectedHistoryId: string | number;
}

export const HistoryInfo = ({ selectedHistoryId }: HistoryInfo) => {
  const { data, isLoading, fields } = useHistoryInfo(selectedHistoryId);
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
