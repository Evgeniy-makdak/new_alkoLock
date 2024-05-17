export enum ValidationMessages {
  required = 'Обязательное поле',
  notValidEmail = 'Некорректная почта',
  notValidPhone = 'Некорректный номер',
  notValidData = 'Невалидное значение',
  notValidUUID4 = 'Некорректный uuid4',
  notValidMacAddress = 'Некорректный MAC-адрес',
  notValidName = 'Не соответствует формату ФИО',
  notValidVin = 'Не соответствует формату VIN',
  notValidPasswordLength = 'Пароль должен быть длиннее 4 символов',
  notValidSerialNumber = 'Серийный номер должен содержать от 1 до 20 символов',
  similarDateOfLicense = 'Дата получения прав должна быть меньше даты истечения срока прав',
}
