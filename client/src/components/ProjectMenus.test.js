import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import ProjectDepartmentsMenuField from './ProjectDepartmentsMenuField';
import ProjectManagerMenuField from './ProjectManagerMenuField';
import { I18nProvider } from '../i18n/I18nProvider';
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
const departments = [{id:1,name:'No department',short_name:'NONE',is_system:1},{id:2,name:'Engineering department',short_name:'ENG'},{id:3,name:'Design department',short_name:'DES'}];
const candidates = [{id:7,name:'Anna',surname:'Engineer',department_id:2},{id:8,name:'Ben',surname:'Designer',department_id:3}];
const click = async node => { expect(node).toBeTruthy(); await act(async () => node.dispatchEvent(new MouseEvent('click',{bubbles:true}))); };
const item = label => document.querySelector(`[role="menuitem"][aria-label="${label}"]`);
async function mount(element) { host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);await act(async()=>root.render(<I18nProvider>{element}</I18nProvider>)); }
afterEach(()=>{act(()=>root.unmount());host.remove();jest.clearAllMocks();});

test('participants immediately display checkmarks, save on close and retain draft on error', async()=>{
  const save=jest.fn().mockResolvedValueOnce({ok:false,error:'Denied'}).mockResolvedValueOnce({ok:true});
  await mount(<ProjectDepartmentsMenuField value={{id:5,departments:[departments[1]],responsible_department_id:2}} departments={departments} inline canEdit onSave={save} />);
  await click(host.querySelector('[aria-label="Настроить подразделения"]'));
  await click(item('Добавить участников'));
  expect([...document.querySelectorAll('button')].find(b=>b.textContent==='Применить')).toBeUndefined();
  await click(item('ENG'));expect(document.body.textContent).toContain('Сначала передайте ответственность');expect(save).not.toHaveBeenCalled();
  await click(item('DES'));expect(item('DES').querySelector('input').checked).toBe(true);expect(save).not.toHaveBeenCalled();
  await click(item('DES'));expect(item('DES').querySelector('input').checked).toBe(false);
  await click(item('DES'));await click(document.querySelector('.MuiBackdrop-root'));expect(save).toHaveBeenLastCalledWith('departmentIds',[2,3]);expect(document.body.textContent).toContain('Denied');
  await click(document.querySelector('.MuiBackdrop-root'));expect(save).toHaveBeenCalledTimes(2);
});
test('transfer requires confirmation and preserves selected target after failure', async()=>{
  const transferred=jest.fn();
  await mount(<ProjectDepartmentsMenuField value={{id:5,departments:[departments[1]],responsible_department_id:2,permissions:{canTransferResponsibility:true}}} departments={departments} inline onTransferred={transferred} />);
  await click(host.querySelector('[aria-label="Настроить подразделения"]'));await click(item('Передать ответственность'));await click(item('DES'));
  expect(axios.post).not.toHaveBeenCalled();
  axios.post.mockRejectedValueOnce(new Error('No'));await click([...document.querySelector('[role="dialog"]').querySelectorAll('button')].find(b=>b.textContent==='Передать ответственность'));
  expect(document.querySelector('[role="dialog"]').textContent).toContain('Design department');
  axios.post.mockResolvedValueOnce({data:{id:5,responsible_department_id:3}});await click([...document.querySelector('[role="dialog"]').querySelectorAll('button')].find(b=>b.textContent==='Передать ответственность'));
  expect(transferred).toHaveBeenCalled();
});
test('creation adds selected responsible department to the draft, not the API', async()=>{
  const change=jest.fn();await mount(<ProjectDepartmentsMenuField value={{departmentIds:[1]}} departments={departments} canEdit onChange={change} />);
  await click(host.querySelector('[aria-label="Настроить подразделения"]'));await click(item('Ответственное подразделение'));await click(item('DES'));
  expect(change).toHaveBeenCalledWith({departmentIds:[3],responsibleDepartmentId:3});expect(axios.post).not.toHaveBeenCalled();
});
test('manager menu groups managed and other departments and retries the chosen employee', async()=>{
  const save=jest.fn().mockResolvedValueOnce({ok:false,error:'Denied'}).mockResolvedValueOnce({ok:true});
  await mount(<ProjectManagerMenuField value={7} candidates={candidates} departments={departments} managedDepartmentIds={[2]} editable inline onSave={save} label="Руководитель проекта" unassigned="Не назначен" />);
  await click(host.querySelector('[aria-label="Руководитель проекта"]'));
  expect([...document.querySelectorAll('[role="menuitem"]')].map(n=>n.getAttribute('aria-label'))).toEqual(['ENG','Другие подразделения','Без руководителя']);
  await click(item('Другие подразделения'));await click(item('DES'));await click(item('Designer Ben'));
  expect(save).toHaveBeenLastCalledWith('managerUserId',8);expect(document.body.textContent).toContain('Denied');
  expect([...document.querySelectorAll('button')].find(b=>b.textContent==='Повторить')).toBeUndefined();
  await click(item('Designer Ben'));expect(save).toHaveBeenCalledTimes(2);
  save.mockResolvedValueOnce({ok:true});
  await click(host.querySelector('[aria-label="Руководитель проекта"]'));await click(item('Без руководителя'));await click(item('Не назначен'));
  expect(save).toHaveBeenLastCalledWith('managerUserId',null);
});
test('read-only menus expose no editing controls', async()=>{
  await mount(<><ProjectDepartmentsMenuField value={{id:5,departments:[departments[1]],responsible_department_id:2}} departments={departments} inline /><ProjectManagerMenuField value={7} candidates={candidates} departments={departments} label="Руководитель проекта" unassigned="Не назначен" /></>);
  expect(host.querySelector('[aria-label="Настроить подразделения"]')).toBeNull();expect(host.querySelector('[aria-label="Руководитель проекта"]')).toBeNull();expect(host.textContent).toContain('Engineer Anna');
});
