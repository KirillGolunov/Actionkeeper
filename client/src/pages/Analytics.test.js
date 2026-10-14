import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Analytics from './Analytics';
import { useAuth } from '../context/AuthContext';
import { useTranslation, I18nProvider } from '../i18n/I18nProvider';

jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/TeamDashboard', () => (props) => <><output data-testid="team-dashboard" onClick={() => props.onOpenProject(17)}>{props.selectedSubject}:{props.teamView}</output><button onClick={()=>props.onPeriodChange({startDate:'2026-05-01',endDate:'2026-05-31'})}>PERIOD</button><button onClick={()=>props.onTeamViewChange('completion')}>VIEW</button></>);
jest.mock('./Projects', () => (props) => <output data-testid="project-dialog" data-project-id={props.initialProjectId}>Диалог проекта</output>);

test('renders team analytics as its own screen', async () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('locale', 'ru');
  useAuth.mockReturnValue({ user: { id: 1, role: 'admin', name: 'Админ', surname: 'Тестов' } });
  axios.get.mockResolvedValue({ data: [] });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<I18nProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Analytics /></MemoryRouter></I18nProvider>);
    await Promise.resolve();
  });
  expect(host.querySelector('[data-testid="team-dashboard"]').textContent).toBe('team:completion');
  act(() => root.unmount());
  host.remove();
  localStorage.removeItem('locale');
  delete window.IS_REACT_ACT_ENVIRONMENT;
});

test('opens the project dialog locally without navigating away from analytics', async () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('locale', 'ru');
  useAuth.mockReturnValue({ user: { id: 1, role: 'admin', name: 'Админ', surname: 'Тестов' } });
  axios.get.mockResolvedValue({ data: [] });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<I18nProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Analytics /></MemoryRouter></I18nProvider>);
    await Promise.resolve();
  });
  act(() => Simulate.click(host.querySelector('[data-testid="team-dashboard"]')));
  expect(host.querySelector('[data-testid="project-dialog"]')?.getAttribute('data-project-id')).toBe('17');
  expect(host.querySelector('[data-testid="team-dashboard"]')).not.toBeNull();
  act(() => root.unmount());
  host.remove();
  localStorage.removeItem('locale');
  delete window.IS_REACT_ACT_ENVIRONMENT;
});

const selection={managedDepartmentIds:[9,2,3],departments:[{id:9,name:'Archived',short_name:'OLD',archived_at:'2026-01-01',users:[]},{id:3,name:'Third',short_name:'THIRD',users:[]},{id:2,name:'Second',short_name:'SECOND',users:[]}]};
function LanguageControl(){const {setLocale}=useTranslation();return <button onClick={()=>setLocale('en')}>EN</button>;}
async function mountAnalytics(user,data=selection,language='ru'){
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.setItem('locale',language);useAuth.mockReturnValue({user});if(data)axios.get.mockResolvedValue({data});
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host);
 await act(async()=>root.render(<I18nProvider><MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Analytics/><LanguageControl/></MemoryRouter></I18nProvider>));
 return {host,close:()=>{act(()=>root.unmount());host.remove();localStorage.clear();jest.clearAllMocks();}};
}
const click=async node=>{await act(async()=>node.dispatchEvent(new MouseEvent('click',{bubbles:true})));};
test('manager defaults to the first active managed department in menu order, ignoring profile and stale session membership',async()=>{const view=await mountAnalytics({id:1,role:'user',department_id:2,managedDepartmentIds:[9]});try{expect(view.host.querySelector('[data-testid="team-dashboard"]').textContent).toBe('department:3:analytics');}finally{view.close();}});
test('administrator who manages departments retains the company completion default',async()=>{const view=await mountAnalytics({id:1,role:'admin',managedDepartmentIds:[3]});try{expect(view.host.querySelector('[data-testid="team-dashboard"]').textContent).toBe('team:completion');}finally{view.close();}});
test('regular employee without managed departments retains company analytics',async()=>{const view=await mountAnalytics({id:1,role:'user'},{departments:[],managedDepartmentIds:[]});try{expect(view.host.querySelector('[data-testid="team-dashboard"]').textContent).toBe('team:analytics');}finally{view.close();}});
test('does not request or render a company dashboard while manager options are loading',async()=>{let resolve;axios.get.mockImplementation(()=>new Promise(done=>{resolve=done;}));const view=await mountAnalytics({id:1,role:'user'},null);try{expect(view.host.querySelector('[data-testid="team-dashboard"]')).toBeNull();expect(view.host.querySelector('[role="progressbar"]')).not.toBeNull();await act(async()=>resolve({data:selection}));expect(view.host.querySelector('[data-testid="team-dashboard"]').textContent).toBe('department:3:analytics');}finally{view.close();}});
test('failed initial loading stays uninitialized and retries with a localized message',async()=>{axios.get.mockRejectedValue({response:{data:{error:'Русская ошибка'}}});const view=await mountAnalytics({id:1,role:'user'},null,'en');try{expect(view.host.querySelector('[data-testid="team-dashboard"]')).toBeNull();expect(document.body.textContent).toContain('Could not load departments');expect(document.body.textContent).not.toContain('Русская ошибка');await click(document.querySelector('[aria-label="Close"]'));expect([...view.host.querySelectorAll('button')].some(node=>node.textContent==='Retry')).toBe(true);axios.get.mockResolvedValue({data:selection});await click([...view.host.querySelectorAll('button')].find(node=>node.textContent==='Retry'));expect(view.host.querySelector('[data-testid="team-dashboard"]').textContent).toBe('department:3:analytics');}finally{view.close();}});
test('manual selection survives period, view, language and catalog updates',async()=>{const view=await mountAnalytics({id:1,role:'user',name:'Ivan',surname:'Employee'});try{await click(view.host.querySelector('[role="combobox"]'));await click(document.querySelector('[role="menuitem"][aria-label="Моя аналитика"]'));await click(document.querySelector('[role="menuitem"][aria-label="Employee Ivan"]'));expect(view.host.querySelector('[data-testid="team-dashboard"]').textContent).toBe('1:analytics');await click([...view.host.querySelectorAll('button')].find(node=>node.textContent==='PERIOD'));await click([...view.host.querySelectorAll('button')].find(node=>node.textContent==='VIEW'));await click([...view.host.querySelectorAll('button')].find(node=>node.textContent==='EN'));expect(view.host.querySelector('[data-testid="team-dashboard"]').textContent).toBe('1:completion');}finally{view.close();}});
