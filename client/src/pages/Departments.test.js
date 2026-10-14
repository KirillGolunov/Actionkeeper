import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import Departments from './Departments';
import { I18nProvider } from '../i18n/I18nProvider';
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
beforeEach(async () => {
  localStorage.setItem('locale', 'ru');
  axios.get.mockImplementation(url => Promise.resolve({ data: url === '/api/departments' ? [{ id: 1, name: 'Без подразделения', short_name: 'Без подразделения', is_system: 1 }, { id: 2, name: 'Development', short_name: 'DEV', is_system: 0 }, {id:3,name:'Archived department',short_name:'OLD',archived_at:'2026-01-01'}] : [{ id: 1, name: 'Active', surname: 'User', deleted: 0, invited: 0 }, { id: 2, name: 'Invited', invited: 1 }, { id: 3, name: 'Deleted', deleted: 1 }] }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<I18nProvider><Departments /></I18nProvider>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); localStorage.clear(); jest.clearAllMocks(); });
const click = async node => { await act(async () => node.dispatchEvent(new MouseEvent('click', { bubbles: true }))); };
const type = async (node, value) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }); };
test('protects the system row and keeps an edited draft after a duplicate rejection', async () => {
  expect(host.querySelectorAll('button[aria-label="Редактировать"]')).toHaveLength(2);
  await click(host.querySelector('button[aria-label="Редактировать"]'));
  const input = host.querySelectorAll('input[aria-label="Наименование"]')[1];
  await type(input, 'Duplicate');
  axios.patch.mockRejectedValue({ response: { data: { errorCode: 'departments.duplicate_name' } } });
  await click(host.querySelector('button[aria-label="Сохранить изменения"]'));
  expect(axios.patch).toHaveBeenCalledWith('/api/departments/2', { name: 'Duplicate', short_name: 'DEV', manager_user_id: null, status:'active' });
  expect(input.value).toBe('Duplicate');
  expect(host.textContent).toContain('Подразделение с таким наименованием уже существует');
});
test('confirms archival and retains the inactive department in the catalog', async () => {
  await click(host.querySelector('button[aria-label="Архивировать"]'));
  expect(axios.delete).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('история часов сохранится');
  axios.delete.mockResolvedValue({ data: { deleted: true } });
  axios.get.mockImplementation(url=>Promise.resolve({data:url==='/api/departments'?[{id:1,name:'Без подразделения',is_system:1},{id:2,name:'Development',short_name:'DEV',archived_at:'2026-10-13'}]:[]}));
  await click([...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent === 'Архивировать'));
  expect(axios.delete).toHaveBeenCalledWith('/api/departments/2');
  expect(host.textContent).toContain('Development');
  expect(host.querySelectorAll('button[aria-label="Редактировать"]')).toHaveLength(1);
});

test('only offers active users as managers, with an unassigned option', async () => {
  const select = host.querySelector('[role="combobox"]');
  await act(async () => select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })));
  const options = [...document.querySelectorAll('[role="option"]')].map(item => item.textContent);
  expect(options).toEqual(['Не назначен', 'User Active']);
});

test('filters active and archived departments while loading the complete catalog',async()=>{
 expect(axios.get).toHaveBeenCalledWith('/api/departments',{params:{includeArchived:1}});
 const filter=name=>[...host.querySelectorAll('[role="button"],button')].find(node=>node.textContent===name);
 expect(host.textContent).toContain('Archived department');
 await click(filter('Активные'));expect(host.textContent).toContain('Development');expect(host.textContent).not.toContain('Archived department');
 await click(filter('Архивные'));expect(host.textContent).toContain('Archived department');expect(host.textContent).not.toContain('Development');expect(host.querySelectorAll('button[aria-label="Редактировать"]')).toHaveLength(1);
 await click(filter('Архивные'));expect(host.textContent).toContain('Development');
});

test('edits archived departments and restores their status',async()=>{
 await click(host.querySelectorAll('button[aria-label="Редактировать"]')[1]);
 const status=host.querySelector('[role="combobox"][aria-label="Статус"]');
 await act(async()=>status.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0})));
 await click([...document.querySelectorAll('[role="option"]')].find(node=>node.textContent==='Активное'));
 axios.patch.mockResolvedValue({data:{id:3,name:'Archived department',short_name:'OLD',manager_user_id:null,archived_at:null}});
 await click(host.querySelector('button[aria-label="Сохранить изменения"]'));
 expect(axios.patch).toHaveBeenCalledWith('/api/departments/3',{name:'Archived department',short_name:'OLD',manager_user_id:null,status:'active'});
 expect(host.textContent).not.toContain('Архивное');
});
