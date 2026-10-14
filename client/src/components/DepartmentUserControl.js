import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button, ButtonBase, Radio, Typography } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import ProjectMenu, { ProjectMenuRadioIcon } from './ProjectMenu';
import { useTranslation } from '../i18n/I18nProvider';
import {getApiErrorMessage} from '../utils/apiErrorMessage';
import ProductErrorToast from './ProductErrorToast';

export default function DepartmentUserControl({ currentUser, purpose='timesheet', value, onChange, startDate, endDate, onOptionsLoaded }) {
  const { t } = useTranslation();
  const [data,setData]=useState({departments:[],managedDepartmentIds:[]}),[anchor,setAnchor]=useState(null),[error,setError]=useState(''),[loadFailed,setLoadFailed]=useState(false);
  const ref=useRef(null),loadedRef=useRef(onOptionsLoaded),retryRef=useRef(null);
  loadedRef.current=onOptionsLoaded;
  useEffect(()=>{
    let canceled=false;
    const load=()=>axios.get('/api/user-selection',{params:{purpose,startDate,endDate}}).then(r=>{if(!canceled){setData(r.data);setError('');setLoadFailed(false);loadedRef.current?.(r.data);}}).catch(e=>{if(!canceled){setLoadFailed(true);setError(getApiErrorMessage(e,t,'departmentHistory.loadError'));}});
    retryRef.current=load;load();const timer=setInterval(load,30000);
    return()=>{canceled=true;clearInterval(timer);retryRef.current=null;};
  },[purpose,startDate,endDate,t,currentUser?.id]);
  const dirs=data.departments||[],mine=data.managedDepartmentIds||[];
  const userName=u=>[u?.surname,u?.name].filter(Boolean).join(' ');
  const selectedUser=dirs.flatMap(d=>d.users).find(u=>String(u.id)===String(value))||(String(currentUser?.id)===String(value)?currentUser:null);
  const selectedDept=dirs.find(d=>`department:${d.id}`===value);
  const selectedLabel=value==='team'?t('analytics.team'):(selectedDept?.is_system?t('departments.unassigned'):selectedDept?.short_name)||userName(selectedUser)||t('departmentHistory.selectEmployee');
  const select=async next=>{await onChange(next);setAnchor(null);};
  const radio=checked=><Radio size="small" checked={checked} icon={<ProjectMenuRadioIcon/>} checkedIcon={<ProjectMenuRadioIcon checked/>} tabIndex={-1} sx={{p:0}} disableRipple/>;
  const departmentNode=d=>({id:`department-${d.id}`,label:d.is_system?t('departments.unassigned'):(d.short_name||d.name),children:[...(purpose==='analytics'?[{id:'all',label:t('departmentHistory.allEmployees'),icon:radio(value===`department:${d.id}`),onClick:()=>select(`department:${d.id}`)}]:[]),...d.users.map(u=>({id:u.id,label:userName(u),icon:radio(String(value)===String(u.id)),onClick:()=>select(u.id)})),...(!d.users.length&&purpose!=='analytics'?[{id:'empty',label:t('projectMenus.noEmployees'),disabled:true}]:[])]});
  const nodes=[
    {id:'self',label:t(purpose==='analytics'?'departmentHistory.myAnalytics':'departmentHistory.myTimesheet'),children:[{id:'self-user',label:userName(currentUser)||currentUser?.email||t('departmentHistory.myTimesheet'),icon:radio(String(value)===String(currentUser?.id)),onClick:()=>select(currentUser.id)}]},
    ...(purpose==='analytics'?[{id:'company',label:t('analytics.team'),children:[{id:'all-company',label:t('departmentHistory.allEmployees'),icon:radio(value==='team'),onClick:()=>select('team')}]}]:[]),
    ...dirs.filter(d=>mine.includes(d.id)).map(departmentNode),
    ...(currentUser?.role==='admin'?[{id:'others',label:t('projectMenus.otherDepartments'),children:dirs.filter(d=>!mine.includes(d.id)&&!d.archived_at).sort((a,b)=>Number(!!a.is_system)-Number(!!b.is_system)).map(departmentNode)},...(dirs.some(d=>d.archived_at)?[{id:'archived',label:t('departmentHistory.archived'),children:dirs.filter(d=>d.archived_at).map(departmentNode)}]:[])]:[]),
  ];
  return <><ButtonBase ref={ref} role="combobox" aria-label={t('homeUser.user')} aria-haspopup="menu" aria-expanded={!!anchor} onClick={()=>setAnchor(ref.current)} onKeyDown={e=>{if(['ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();setAnchor(ref.current);}}} sx={{width:{xs:'100%',sm:280},height:40,px:1.5,border:'1px solid #E2E4E9',borderRadius:'8px',background:'#FFFFFF',display:'flex',alignItems:'center',gap:1,justifyContent:'space-between'}}><Typography noWrap sx={{fontSize:14,minWidth:0}}>{selectedLabel}</Typography><KeyboardArrowDownRoundedIcon sx={{fontSize:20,color:'#7F899E'}}/></ButtonBase>{anchor&&<ProjectMenu anchor={anchor} onClose={()=>setAnchor(null)} label={t('homeUser.user')} nodes={nodes}/> }{loadFailed&&<Button onClick={()=>retryRef.current?.()} sx={{ml:1,textTransform:'none'}}>{t('common.actions.retry')}</Button>}<ProductErrorToast message={error} onClose={()=>setError('')}/></>;
}
