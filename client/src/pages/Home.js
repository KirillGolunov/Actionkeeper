import React,{useEffect,useState} from 'react';
import {Box} from '@mui/material';
import {Navigate,useSearchParams} from 'react-router-dom';
import DepartmentUserControl from '../components/DepartmentUserControl';
import TimeEntries from './TimeEntries';
import {useAuth} from '../context/AuthContext';
import {useTranslation} from '../i18n/I18nProvider';
const key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export default function Home(){
 const {user}=useAuth(),{t}=useTranslation();const [params,setParams]=useSearchParams(),[dirty,setDirty]=useState(false);
 const privileged=user?.role==='admin'||!!user?.managedDepartmentIds?.length;
 const requested=params.get('userId');const selected=privileged&&requested?Number(requested):user?.id;
 const requestedWeek=params.get('week');const validWeek=/^\d{4}-\d{2}-\d{2}$/.test(requestedWeek||'')&&!Number.isNaN(Date.parse(requestedWeek));
 const week=new Date(`${validWeek?requestedWeek:key(new Date())}T12:00:00`);if(!validWeek)week.setDate(week.getDate()-(week.getDay()+6)%7);
 const end=new Date(week);end.setDate(end.getDate()+6);
 useEffect(()=>{if(user&&!privileged&&requested)setParams({mode:'mine',week:key(week)},{replace:true});},[user,privileged,requested]); // eslint-disable-line react-hooks/exhaustive-deps
 if(['team','managed','company','portfolio'].includes(params.get('mode')))return <Navigate to="/analytics" replace/>;
 return <Box sx={{height:'100%',minHeight:0,p:{xs:1,sm:2,xl:3},pt:{xs:7,sm:2,xl:3},overflow:'hidden',bgcolor:'#F6F7F9'}}><Box sx={{height:'100%',minHeight:0,display:'grid',gridTemplateRows:{xs:'auto minmax(0,1fr)',sm:'68px minmax(0,1fr)'},gap:1.5}}><Box sx={{px:{xs:2,sm:3},display:'flex',alignItems:'center',bgcolor:'#FFFFFF',border:'1px solid #E2E4E9',borderRadius:3}}><DepartmentUserControl currentUser={user} value={selected} startDate={key(week)} endDate={key(end)} onChange={id=>{if(dirty&&!window.confirm(t('departmentHistory.discardDraft')))return;setParams({mode:'mine',userId:String(id),week:key(week)},{replace:true});}}/></Box><Box sx={{minHeight:0,overflow:'hidden'}}><TimeEntries embedded selectedUserId={selected} weekAnchor={`${key(week)}T12:00:00`} onDirtyChange={setDirty} onWeekChange={date=>setParams({mode:'mine',userId:String(selected),week:key(date)},{replace:true})}/></Box></Box></Box>;
}
