export enum ValidationMessages {
  required = 'Обязательное поле',
  notValidEmail = 'Введено некорректное имя почтового ящика . Допустимо использовать только латинские или кириллические буквы, цифры, знак подчеркивания, точку, минус и знак @.',
  notValidPhone = 'Некорректный номер',
  notValidData = 'Невалидное значение',
  notValidUUID4 = 'Некорректный uuid4',
  notValidMacAddress = 'Некорректный MAC-адрес',
  notValidName = 'Не соответствует формату ФИО',
  notValidVin = 'Не соответствует формату VIN',
  notValidPasswordLength = 'Длина пароля должна быть от 4 до 100 символов',
  notValidSerialNumber = 'Серийный номер должен содержать от 1 до 20 символов',
  similarDateOfLicense = 'Дата получения прав должна быть меньше даты истечения срока прав',
}
