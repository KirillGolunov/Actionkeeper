export function getApiErrorMessage(error, t, fallbackKey) {
  const errorCode = error?.response?.data?.errorCode;
  const serverMessage = error?.response?.data?.error;

  const keyMap = {
    'setup.required': 'setup.failed',
    'setup.already_completed': 'setup.failed',
    'setup.missing_required_fields': 'setup.failed',
    'setup.smtp_required_in_production': 'setup.testFailed',
    'smtp.incomplete': 'smtp.testFailed',
    'smtp.not_configured': 'smtp.testFailed',
    'smtp.save_failed': 'smtp.saveFailed',
    'smtp.forbidden': 'common.notAuthorized',
    'invitations.invalid_or_expired': 'auth.invitation.invalidOrExpired',
    'invitations.name_surname_required': 'auth.invitation.failed',
    'invitations.email_required': 'users.errors.sendInvitation',
    'invitations.send_failed': 'users.errors.sendInvitation',
    'auth.magic_link_invalid': 'auth.magicLink.invalidOrExpired',
    'auth.magic_link_used': 'auth.magicLink.invalidOrExpired',
    'auth.magic_link_expired': 'auth.magicLink.invalidOrExpired',
    'auth.magic_link_send_failed': 'auth.signIn.sendFailed',
    'auth.magic_link_rate_limited': 'auth.signIn.sendFailed',
    'auth.user_not_found': 'auth.signIn.sendFailed',
    'auth.email_required': 'auth.signIn.sendFailed',
    'users.not_found': 'users.errors.update',
    'users.no_fields_to_update': 'users.errors.update',
    'clients.not_found': 'clients.errors.update',
    'clients.duplicate': 'clients.errors.createDuplicate',
    'projects.not_found': 'projects.errors.update',
    'projects.duplicate_name': 'projects.validation.duplicateName',
    'projects.duplicate_code': 'projects.validation.duplicateCode',
    'projects.no_fields_to_update': 'projects.errors.update',
    'time_entries.duplicate': 'timeEntries.errors.create',
    'time_entries.not_found': 'timeEntries.errors.update',
    'time_entries.no_fields_to_update': 'timeEntries.errors.update',
    'time_entries.week_required': 'timeEntries.errors.deleteProjectEntries',
    'time_entries.no_entries': 'timeEntries.errors.submit',
    'upload.no_file': 'profile.errors.upload',
  };

  if (errorCode && keyMap[errorCode]) {
    return t(keyMap[errorCode]);
  }

  if (fallbackKey) {
    return t(fallbackKey);
  }

  return serverMessage || 'Request failed';
}
