import { ReactNode, createContext, useContext, useState } from 'react';

type VehicleModeMap = Record<string, string | undefined>;

type MapContextType = {
  vehicleModes: VehicleModeMap;
  setVehicleMode: (vehicleId: string, mode: string | undefined) => void;
};

const MapContext = createContext<MapContextType>({
  vehicleModes: {},
  setVehicleMode: () => {},
});

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [vehicleModes, setVehicleModes] = useState<VehicleModeMap>({});
  const setVehicleMode = (vehicleId: string, mode: string | undefined) => {
    setVehicleModes((prev) => ({
      ...prev,
      [vehicleId]: mode,
    }));
  };

  return (
    <MapContext.Provider value={{ vehicleModes, setVehicleMode }}>{children}</MapContext.Provider>
  );
};

export const useMapContext = () => useContext(MapContext);
