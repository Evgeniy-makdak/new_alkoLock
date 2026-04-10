import i18n from '../../i18n';

export class ValidationMessages {
  static get required() {
    return i18n.t('validation.required');
  }
  static get notValidEmail() {
    return i18n.t('validation.notValidEmail');
  }
  static get notValidPhone() {
    return i18n.t('validation.notValidPhone');
  }
  static get notValidData() {
    return i18n.t('validation.notValidData');
  }
  static get notValidUUID4() {
    return i18n.t('validation.notValidUUID4');
  }
  static get notValidMacAddress() {
    return i18n.t('validation.notValidMacAddress');
  }
  static get notValidName() {
    return i18n.t('validation.notValidName');
  }
  static get notValidVin() {
    return i18n.t('validation.notValidVin');
  }
  static get notValidPasswordLength() {
    return i18n.t('validation.notValidPasswordLength');
  }
  static get notValidSerialNumber() {
    return i18n.t('validation.notValidSerialNumber');
  }
  static get similarDateOfLicense() {
    return i18n.t('validation.similarDateOfLicense');
  }
  static get defaultError() {
    return i18n.t('validation.defaultError');
  }
  static get passwordsMustMatch() {
    return i18n.t('validation.passwordsMustMatch');
  }
  static get passwordsNotMustMatch() {
    return i18n.t('validation.passwordsNotMustMatch');
  }
  static get dateIssueMaxToday() {
    return i18n.t('validation.dateIssueMaxToday');
  }
  static get dateExpirationMinToday() {
    return i18n.t('validation.dateExpirationMinToday');
  }
  static get expirationDateBeforeIssue() {
    return i18n.t('validation.expirationDateBeforeIssue');
  }
  static get email() {
    return i18n.t('validation.notValidEmail');
  }
}
