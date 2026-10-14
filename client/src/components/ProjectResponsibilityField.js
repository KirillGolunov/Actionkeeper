import React, { useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import DepartmentChips from './DepartmentChips';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';
export default function ProjectResponsibilityField({ value, departments = [], inline, onChange, onTransferred, onBeforeTransfer }) {
  const { t } = useTranslation();
  const [historyOnly, setHistoryOnly] = useState(false);
  const [open, setOpen] = useState(false), [target, setTarget] = useState(''), [saving, setSaving] = useState(false), [error, setError] = useState(''), [history, setHistory] = useState([]);
  const current = departments.find(d => d.id === (inline ? value.responsible_department_id : value.responsibleDepartmentId));
  const loadHistory = async () => { try { setHistory((await axios.get(`/api/projects/${value.id}/responsibility-history`)).data); } catch (e) { setError(getApiErrorMessage(e, t, 'governance.transferFailed')); } };
  const transfer = async () => {
    setSaving(true); setError('');
    try { const response = await axios.post(`/api/projects/${value.id}/transfer-responsibility`, { departmentId: Number(target) }); onTransferred(response.data); setOpen(false); if (response.data.emailDelivery === 'failed') setError(t('governance.deliveryWarning')); }
    catch (e) { setError(getApiErrorMessage(e, t, 'governance.transferFailed')); }
    finally { setSaving(false); }
  };
  if (!inline) return <TextField select required size="small" fullWidth label={t('governance.owner')} value={current?.id || ''} onChange={e => onChange({ ...value, responsibleDepartmentId: e.target.value })}>
    <MenuItem value="" disabled>{t('governance.chooseOwner')}</MenuItem>
    {departments.filter(d => value.departmentIds?.includes(d.id)).map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
  </TextField>;
  return <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ color: '#7A8699', fontSize: 11.5, px: 0.5 }}>{t('governance.owner')}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, px: 1.1 }}>
      {current ? <DepartmentChips departments={[current]} /> : <Typography sx={{ fontSize: 14 }}>{t('governance.unassignedOwner')}</Typography>}
      {value.permissions?.canTransferResponsibility && <Button size="small" onClick={async () => { if (await onBeforeTransfer?.() === false) return; setHistoryOnly(false); setTarget(''); setError(''); setOpen(true); loadHistory(); }}>{t('governance.transfer')}</Button>}
      <Button size="small" onClick={() => { setHistoryOnly(true); setError(''); setOpen(true); loadHistory(); }}>{t('governance.history')}</Button>
    </Box>
    {!open && error && <Alert severity="warning">{error}</Alert>}
    <Dialog open={open} onClose={() => { if (!saving) setOpen(false); }} fullWidth maxWidth="sm">
      <DialogTitle>{t(historyOnly ? 'governance.history' : 'governance.transfer')}</DialogTitle>
      <DialogContent>
        {!historyOnly && <>
        <Alert severity="info" sx={{ mb: 2 }}>{t('governance.transferExplanation')}</Alert>
        <TextField select fullWidth label={t('governance.owner')} value={target} disabled={saving} onChange={e => setTarget(e.target.value)}>{departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</TextField>
        </>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {history.length > 0 && <><Typography sx={{ mt: 2, fontWeight: 600 }}>{t('governance.history')}</Typography>{history.map(item => <Typography key={item.id} sx={{ mt: 1, fontSize: 13 }}>{item.from_department_name || '—'} → {item.to_department_name} · {[item.actor_surname,item.actor_name].filter(Boolean).join(' ')} · {item.created_at}</Typography>)}</>}
      </DialogContent>
      <DialogActions><Button disabled={saving} onClick={() => setOpen(false)}>{t('common.actions.cancel')}</Button>{!historyOnly && <Button disabled={saving || !target} onClick={transfer}>{t('governance.transfer')}</Button>}</DialogActions>
    </Dialog>
  </Box>;
}
