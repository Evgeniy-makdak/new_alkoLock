import { Dayjs } from 'dayjs';

export type EventData = {
  id?: string | number;
  user?: {
    id?: number;
    fullName?: string;
  };
  action?: {
    id?: string | number;
    type?: any;
    vehicleRecord?: {
      manufacturer?: string;
      model?: string;
      registrationNumber?: string;
      year?: number;
      vin?: string;
      type?: string;
      color?: string;
    };
    device?: {
      id?: string;
      mode?: 'Рабочий' | 'Аварийный' | 'Сервисный';
      name?: string;
      serialNumber?: string;
    };
  };
  eventType?: string;
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  mode?: string;
};

export type VehicleEventsGroup = {
  vehicle: {
    type?: string;
    color?: string;
    monitoringDevice?: {
      mode?: string;
      name?: string;
      serialNumber?: string;
    };
    manufacturer?: string;
    model?: string;
    registrationNumber?: string;
    id?: string | number;
    year?: number;
    vin?: string;
    isActive?: boolean;
  };
  events: EventData[];
  latitude: number;
  longitude: number;
  mode?: string;
};

export type MapPageProps = {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  setStartDate: (date: Dayjs | null) => void;
  setEndDate: (date: Dayjs | null) => void;
  handleResetFilters: () => void;
  debugInfo: string;
  selectedVehicleId: string | null;
  handleCloseAside: () => void;
  allVehicleEvents: Map<string, EventData[]>;
  isMapPage: boolean;
};
