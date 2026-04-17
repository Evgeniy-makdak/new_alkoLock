/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable no-console */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CarsApi } from '@shared/api/baseQuerys';
import { ID } from '@shared/types/BaseQueryTypes';

import { useVehiclesInfoApi } from '../api/useVehiclesInfoApi';
import { getFields } from '../lib/getFields';

export const useVehiclesInfo = (id: ID, closeTab: () => void) => {
  const { t } = useTranslation();
  const { car, isLoading, notFoundCar } = useVehiclesInfoApi(id);
  const [colorMap, setColorMap] = useState<{ [key: string]: string }>({});
  const [loadingColors, setLoadingColors] = useState(true);
  const [typeMap, setTypeMap] = useState<{ [key: string]: string }>({});
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    const fetchColorsAndTypes = async () => {
      try {
        const [colorsResp, typesResp] = await Promise.all([
          CarsApi.getVehicleColors(),
          CarsApi.getVehicleTypes(),
        ]);

        const colorMapping = (colorsResp.data as Array<{ key: string; value: string }>).reduce(
          (acc, { key, value }) => ({ ...acc, [key]: value }),
          {},
        );

        const typeMapping = (typesResp.data as Array<{ key: string; value: string }>).reduce(
          (acc, { key, value }) => ({ ...acc, [key]: value }),
          {},
        );

        setColorMap(colorMapping);
        setTypeMap(typeMapping);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingColors(false);
        setLoadingTypes(false);
      }
    };

    fetchColorsAndTypes();
  }, []);

  useEffect(() => {
    if (notFoundCar) closeTab();
  }, [notFoundCar, closeTab]);

  const fields = useMemo(() => {
    if (!car) return [];
    return getFields(
      {
        ...car,
        color: colorMap[car.color] ?? car.color,
        type: typeMap[car.type] ?? car.type,
      },
      t,
    );
  }, [car, colorMap, typeMap, t]);

  return {
    isLoading: isLoading || loadingColors || loadingTypes,
    fields,
    car,
  };
};
