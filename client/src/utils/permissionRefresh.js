import { createRefreshLoader } from './refreshLoader';

export function createPermissionRefresh({ request, onPermissions, ...options }) {
  let lastDays = {};
  const deny = () => onPermissions({ ...lastDays, denied: true });
  deny();
  return createRefreshLoader({
    ...options, request,
    onSuccess: response => {
      const days = response?.data?.days;
      if (!days || typeof days !== 'object' || Array.isArray(days) || !Object.keys(days).length || Object.values(days).some(day => !day || typeof day.canEdit !== 'boolean')) { deny(); return; }
      lastDays = days;
      onPermissions({ ...days, denied: false });
    },
    onUnavailable: deny, onError: deny,
  });
}
