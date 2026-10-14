import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import ProjectResponsibilityField from './ProjectResponsibilityField';
import { I18nProvider } from '../i18n/I18nProvider';
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
const dirs = [{ id: 1, name: 'Department A', short_name: 'A' }, { id: 2, name: 'Department B', short_name: 'B' }];
async function mount(props) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); await act(async () => root.render(<I18nProvider><ProjectResponsibilityField departments={dirs} {...props} /></I18nProvider>)); }
const click = async node => { await act(async () => node.dispatchEvent(new MouseEvent('click',{ bubbles:true }))); };
afterEach(() => { act(()=>root.unmount()); host.remove(); jest.clearAllMocks(); });
test('creation offers only departments selected for project visibility', async () => {
  const change=jest.fn(); await mount({ value: { departmentIds:[1] }, onChange:change });
  await act(async()=>host.querySelector('[role="combobox"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0})));
  expect([...document.querySelectorAll('[role="option"]')].map(n=>n.textContent)).toEqual(['Выберите ответственное подразделение','Department A']);
});
test('read-only project displays responsibility and history without a transfer action', async () => {
  await mount({ inline:true, value:{ id:5, responsible_department_id:1, permissions:{canTransferResponsibility:false} } });
  expect(host.textContent).toContain('A'); expect(host.textContent).toContain('История передачи'); expect(host.textContent).not.toContain('Передать ответственность');
});
test('transfer confirmation retains selection on error and updates the project after retry', async () => {
  axios.get.mockResolvedValue({data:[]}); const transferred=jest.fn();
  await mount({ inline:true, value:{id:5,responsible_department_id:1,permissions:{canTransferResponsibility:true}}, onTransferred:transferred });
  await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Передать ответственность'));
  const dialog=document.querySelector('[role="dialog"]'); expect(dialog.textContent).toContain('Новому подразделению будет открыт доступ');
  await act(async()=>dialog.querySelector('[role="combobox"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0})));
  await click([...document.querySelectorAll('[role="option"]')].find(n=>n.textContent==='Department B'));
  axios.post.mockRejectedValueOnce({response:{data:{errorCode:'projects.transfer_forbidden'}}});
  await click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='Передать ответственность'));
  expect(dialog.textContent).toContain('Department B'); expect(transferred).not.toHaveBeenCalled();
  axios.post.mockResolvedValueOnce({data:{id:5,responsible_department_id:2,permissions:{canTransferResponsibility:true}}});
  await click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='Передать ответственность'));
  expect(axios.post).toHaveBeenLastCalledWith('/api/projects/5/transfer-responsibility',{departmentId:2}); expect(transferred).toHaveBeenCalledWith(expect.objectContaining({responsible_department_id:2}));
});
