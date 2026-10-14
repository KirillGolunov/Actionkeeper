import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PageLayout, { PageToolbar, pageFilterChipSx } from '../components/PageLayout';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

const emptyDraft = () => ({ name: '', short_name: '', manager_user_id: null });
const cellSx = { px: 1.25, py: 1, minWidth: 0, overflow: 'hidden', verticalAlign:'middle' };
const inputSx = { width: '100%', background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } };
const iconSx = { minWidth: 36, width: 36, height: 32, borderRadius: 2, p: 0, boxShadow: 'none' };
const addSx = { width:78, minWidth:78, height: 32, borderRadius: 2, fontWeight: 500, fontSize: 12, textTransform: 'none', backgroundColor: '#8196E4', color: '#FFFFFF', '&:hover': { backgroundColor: '#4A69D9' } };

export default function Departments() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [statusFilter,setStatusFilter]=useState('all');
  const [users, setUsers] = useState([]);
  const [addDraft, setAddDraft] = useState(emptyDraft);
  const [draft, setDraft] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dirs, people] = await Promise.all([axios.get('/api/departments',{params:{includeArchived:1}}), axios.get('/api/users')]);
      setItems(dirs.data); setUsers(people.data.filter(u => !u.deleted && !u.invited)); setLoadFailed(false);
    } catch (e) { setLoadFailed(true); setError(getApiErrorMessage(e, t, 'departments.loadFailed')); }
    finally { setLoading(false); }
  }, [t]);
  useEffect(() => { load(); }, [load]);
  const save = async (editing,confirmed=false) => {
    const value = editing ? draft : addDraft;
    setError('');
    if (!value.name.trim() || value.name.trim().length > 120) { setError(t('departments.nameRequired')); return; }
    if (!value.short_name.trim() || value.short_name.trim().length > 120) { setError(t('departments.shortNameRequired')); return; }
    if(editing&&value.status==='archived'&&!items.find(d=>d.id===value.id)?.archived_at&&!confirmed){setToDelete({...value,fromEdit:true});return false;}
    setSaving(true);
    try {
      const body = { name: value.name.trim(), short_name: value.short_name.trim(), manager_user_id: value.manager_user_id ?? null, ...(editing?{status:value.status||(value.archived_at?'archived':'active')}:{}) };
      const response = editing ? await axios.patch(`/api/departments/${value.id}`, body) : await axios.post('/api/departments', body);
      setItems(prev => editing ? prev.map(d => d.id === value.id ? response.data : d) : [...prev, response.data]);
      if (editing) setDraft(null); else setAddDraft(emptyDraft());
      return true;
    } catch (e) { setError(getApiErrorMessage(e, t, 'departments.saveFailed')); return false; }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if(toDelete.fromEdit){if(await save(true,true))setToDelete(null);return;}
    setSaving(true); setError('');
    try { await axios.delete(`/api/departments/${toDelete.id}`); setToDelete(null); await load(); }
    catch (e) { setError(getApiErrorMessage(e, t, 'departments.deleteFailed')); }
    finally { setSaving(false); }
  };
  const statusChip=status=><Chip size="small" label={t(status==='archived'?'departments.archivedStatus':'departments.activeStatus')} sx={{height:22,fontSize:11,borderRadius:'6px',background:status==='archived'?'#F5F7FA':'#F5F7FE',color:status==='archived'?'#BDBDBD':'#5673DC',border:`1px solid ${status==='archived'?'#BDBDBD':'#5673DC'}`}}/>;
  const fields = (value, update) => <>
    <TableCell sx={cellSx}><TextField size="small" fullWidth placeholder={t('departments.name')} value={value.name} onChange={e => update({ ...value, name: e.target.value })} disabled={saving} inputProps={{ maxLength: 120, 'aria-label': t('departments.name') }} sx={inputSx} /></TableCell>
    <TableCell sx={cellSx}><TextField size="small" fullWidth placeholder={t('departments.shortName')} value={value.short_name || ''} onChange={e => update({ ...value, short_name: e.target.value })} disabled={saving} inputProps={{ maxLength: 120, 'aria-label': t('departments.shortName') }} sx={inputSx} /></TableCell>
    <TableCell sx={cellSx}><TextField select size="small" fullWidth value={value.manager_user_id ?? ''} onChange={e => update({ ...value, manager_user_id: e.target.value === '' ? null : Number(e.target.value) })} disabled={saving} SelectProps={{ displayEmpty: true, inputProps: { 'aria-label': t('departments.manager') } }} sx={inputSx}>
      <MenuItem value="">{t('departments.noManager')}</MenuItem>
      {users.map(u => <MenuItem key={u.id} value={u.id}>{[u.surname, u.name].filter(Boolean).join(' ')}</MenuItem>)}
    </TextField></TableCell>
    <TableCell sx={cellSx}>{value.id?<TextField select size="small" fullWidth value={value.status||(value.archived_at?'archived':'active')} disabled={saving} onChange={e=>update({...value,status:e.target.value})} SelectProps={{renderValue:statusChip,inputProps:{'aria-label':t('departments.status')}}} sx={inputSx}><MenuItem value="active">{statusChip('active')}</MenuItem><MenuItem value="archived">{statusChip('archived')}</MenuItem></TextField>:statusChip('active')}</TableCell>
  </>;
  return <PageLayout title={t('departments.title')} subtitle={t('departments.catalogCount', { count: items.length })} toolbar={<PageToolbar start={<>{['active','archived'].map(status=><Chip key={status} clickable label={t(`departments.${status}`)} aria-pressed={statusFilter===status} onClick={()=>setStatusFilter(current=>current===status?'all':status)} sx={{...pageFilterChipSx,minWidth:112,...(statusFilter===status?{background:status==='active'?'#F5F7FE':'#F5EAFE',color:status==='active'?'#5673DC':'#A259E6',border:`1px solid ${status==='active'?'#5673DC':'#A259E6'}`}:{background:'#F5F7FA',color:'#90A0B7',border:'none'})}}/>)}</>} />}>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {loading && <CircularProgress size={24} />}
    {loadFailed && <Button onClick={load}>{t('departments.retry')}</Button>}
    <TableContainer component={Paper} sx={{ mb: 3, border: '1px solid #E2E4E9', borderRadius: '12px', boxShadow: '1', overflowX: 'auto', width: '100%' }}>
      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 840 }}>
        <TableHead><TableRow sx={{ height: 40 }}>
          {[['name', '28%'], ['shortName', '18%'], ['manager', '24%'], ['status','14%'], ['actions', '16%']].map(([key, width]) => <TableCell key={key} align={key === 'actions' ? 'right' : 'left'} sx={{ ...cellSx, fontWeight: 'bold', width }}>{t(`departments.${key}`)}</TableCell>)}
        </TableRow></TableHead>
        <TableBody>
          <TableRow>{fields(addDraft, setAddDraft)}<TableCell align="right" sx={cellSx}><Button variant="contained" size="small" sx={addSx} disabled={saving || loading || loadFailed} onClick={() => save(false)}>{t('users.add')}</Button></TableCell></TableRow>
          {items.filter(d=>statusFilter==='all'||(statusFilter==='archived'?!!d.archived_at:!d.archived_at)).map(d => <TableRow key={d.id} sx={d.archived_at&&draft?.id!==d.id?{'& td':{color:'#BDBDBD'}}:{}}>
            {draft?.id === d.id ? fields(draft, setDraft) : <>
              <TableCell sx={cellSx}>{d.is_system ? t('departments.unassigned') : d.name}</TableCell>
              <TableCell sx={cellSx}>{d.is_system ? t('departments.unassigned') : d.short_name}</TableCell>
              <TableCell sx={cellSx}>{d.manager_user_id ? [d.manager_surname, d.manager_name].filter(Boolean).join(' ') : t('departments.noManager')}</TableCell>
              <TableCell sx={cellSx}>{statusChip(d.archived_at?'archived':'active')}</TableCell>
            </>}
            <TableCell align="right" sx={cellSx}>{!d.is_system && <Box sx={{display:'grid',gridTemplateColumns:'repeat(2, 36px)',gap:0.75,width:78,height:32,ml:'auto',alignItems:'center','& > span':{display:'flex',width:36,height:32}}}>
              {draft?.id === d.id ? <>
                <Tooltip title={t('profile.saveChanges')}><span><Button aria-label={t('profile.saveChanges')} sx={iconSx} disabled={saving} onClick={() => save(true)}><CheckIcon fontSize="small" /></Button></span></Tooltip>
                <Tooltip title={t('common.actions.cancel')}><span><Button aria-label={t('common.actions.cancel')} sx={iconSx} disabled={saving} onClick={() => { setDraft(null); setError(''); }}><CloseIcon fontSize="small" /></Button></span></Tooltip>
              </> : <>
                <Tooltip title={t('departments.edit')}><span><Button aria-label={t('departments.edit')} sx={iconSx} disabled={saving || !!draft} onClick={() => { setDraft({ ...d, status:d.archived_at?'archived':'active' }); setError(''); }}><EditIcon fontSize="small" /></Button></span></Tooltip>
                {!d.archived_at&&<Tooltip title={t('departments.delete')}><span><Button aria-label={t('departments.delete')} sx={iconSx} color="error" disabled={saving || !!draft} onClick={() => { setToDelete(d); setError(''); }}><ArchiveIcon fontSize="small" /></Button></span></Tooltip>}
              </>}
            </Box>}</TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>
    <Dialog open={!!toDelete} onClose={() => { if (!saving) setToDelete(null); }}>
      <DialogTitle>{t('departments.deleteTitle')}</DialogTitle>
      <DialogContent>{toDelete?.name}<Alert severity="warning" sx={{ mt: 2 }}>{t('departments.deleteExplanation')}</Alert>{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}</DialogContent>
      <DialogActions><Button disabled={saving} onClick={() => setToDelete(null)}>{t('common.actions.cancel')}</Button><Button disabled={saving} color="error" onClick={remove}>{t('departments.delete')}</Button></DialogActions>
    </Dialog>
  </PageLayout>;
}
