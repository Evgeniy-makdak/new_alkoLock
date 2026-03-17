import { FC, useEffect, useState } from 'react';

import {
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Typography,
} from '@mui/material';

import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';
import { Formatters } from '@shared/utils/formatters';

interface Driver {
  id: ID;
  driver: {
    id: ID;
    licenseCode: string;
    userAccount: {
      id: ID;
      fullName: string;
      firstName: string;
      surname: string;
      middleName: string;
    };
  };
  vehicle: {
    id: ID;
    registrationNumber: string;
    manufacturer: string;
    model: string;
  };
}

interface DriversTransferModalProps {
  open: boolean;
  onClose: () => void;
  drivers: Driver[];
  newVehicleId: ID | null;
  originalVehicleId: ID | null;
  onConfirm: (driverIds: ID[]) => void;
  isLoading: boolean;
  newVehicleData?: {
    id: ID;
    registrationNumber: string;
    manufacturer: string;
    model: string;
  } | null;
}

export const DriversTransferModal: FC<DriversTransferModalProps> = ({
  open,
  onClose,
  drivers,
  newVehicleId,
  originalVehicleId,
  onConfirm,
  isLoading,
  newVehicleData,
}) => {
  const [selectedDrivers, setSelectedDrivers] = useState<ID[]>([]);

  useEffect(() => {
    if (open && drivers.length > 0) {
      // По умолчанию выбираем всех водителей (теперь они все подходят для переноса)
      setSelectedDrivers(drivers.map((driver) => driver.driver.id));
    }
  }, [open, drivers]);

  const handleToggleDriver = (driverId: ID) => {
    setSelectedDrivers((prev) =>
      prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId],
    );
  };

  const handleToggleAll = () => {
    if (selectedDrivers.length === drivers.length) {
      setSelectedDrivers([]);
    } else {
      setSelectedDrivers(drivers.map((driver) => driver.driver.id));
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedDrivers);
  };

  // Новая функция для обработки нажатия на кнопку "Пропустить"
  const handleSkip = () => {
    // Снимаем все галочки (пустой массив) и отправляем запрос
    onConfirm([]);
  };

  const getVehicleName = (vehicleId: ID | null) => {
    if (!vehicleId) return 'неизвестное ТС';

    // Если переданы данные нового ТС, используем их
    if (newVehicleData && vehicleId === newVehicleData.id) {
      return `${newVehicleData.manufacturer} ${newVehicleData.model} (${newVehicleData.registrationNumber})`;
    }

    // Ищем транспортное средство в списке привязок
    const vehicle = drivers.find((attachment) => attachment.vehicle?.id === vehicleId)?.vehicle;
    if (vehicle) {
      return `${vehicle.manufacturer} ${vehicle.model} (${vehicle.registrationNumber})`;
    }

    return `ТС #${vehicleId}`;
  };

  const getButtonText = () => {
    if (isLoading) return 'Сохранение...';
    if (selectedDrivers.length === 0) return 'Не перепривязывать водителей';
    return 'Добавить';
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        // Запрещаем закрытие при клике вне модального окна или нажатии ESC
        if (reason !== 'backdropClick') {
          onClose();
        }
      }}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown>
      <DialogTitle>Перенос привязок водителей</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          Добавить привязки к <strong>{getVehicleName(newVehicleId)}</strong> для водителей, имеющих
          привязки к <strong>{getVehicleName(originalVehicleId)}</strong>?
        </Typography>

        {drivers.length > 0 ? (
          <Box>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedDrivers.length === drivers.length}
                    indeterminate={
                      selectedDrivers.length > 0 && selectedDrivers.length < drivers.length
                    }
                    onChange={handleToggleAll}
                  />
                }
                label="Выбрать всех"
              />

              <Box sx={{ maxHeight: 300, overflow: 'auto', mt: 1 }}>
                {drivers.map((attachment) => (
                  <Box
                    key={attachment.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                    }}>
                    <Checkbox
                      checked={selectedDrivers.includes(attachment.driver.id)}
                      onChange={() => handleToggleDriver(attachment.driver.id)}
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {Formatters.nameFormatter(attachment.driver.userAccount)}(
                      {attachment.driver.licenseCode})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </FormGroup>

            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Выбрано: {selectedDrivers.length} из {drivers.length} водителей
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="textSecondary">
            Нет водителей для переноса. Все водители, привязанные к старому ТС, уже имеют привязки к
            новому ТС.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'flex-end', padding: 5 }}>
        <Button onClick={handleSkip} variant="outlined" sx={{ mr: 1 }} disabled={isLoading}>
          Пропустить
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading || drivers.length === 0}>
          {getButtonText()}
        </Button>
      </DialogActions>

      <Loader isLoading={isLoading}>{null}</Loader>
    </Dialog>
  );
};
