import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import axios from 'axios';
import Users from './Users';
import {I18nProvider} from '../i18n/I18nProvider';
jest.mock('axios',()=>({get:jest.fn(),patch:jest.fn()}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:1,role:'admin'}})}));
jest.mock('../components/DepartmentHistoryDialog',()=>({__esModule:true,default:({user})=>user?<div role="dialog">Transfer history for {user.id}</div>:null}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let host,root;
beforeEach(async()=>{localStorage.setItem('locale','ru');axios.get.mockImplementation(url=>Promise.resolve({data:url==='/api/departments'?[{id:2,name:'Engineering',short_name:'ENG'}]:url==='/api/users'?[{id:4,name:'Ivan',surname:'Employee',email:'employee@test.invalid',role:'user',department_id:2,department_name:'Engineering',deleted:0,invited:0}]:[]}));axios.patch.mockResolvedValue({data:{}});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);await act(async()=>root.render(<I18nProvider><Users/></I18nProvider>));});
afterEach(()=>{act(()=>root.unmount());host.remove();localStorage.clear();jest.clearAllMocks();});
async function edit(){await act(async()=>host.querySelector('[data-testid="EditIcon"]').closest('button').click());}
test('short department chip opens dated history without entering profile editing',async()=>{const chip=host.querySelector('[aria-label="Изменить подразделение"]');expect(chip.textContent).toBe('ENG');expect(host.querySelector('button[aria-label="История подразделений"]')).toBeNull();await act(async()=>chip.click());expect(host.querySelector('[role="dialog"]').textContent).toContain('Transfer history for 4');});

test('saving profile fields does not submit a direct or stale department assignment',async()=>{await edit();await act(async()=>host.querySelector('[data-testid="CheckIcon"]').closest('button').click());expect(axios.patch).toHaveBeenCalledWith('/api/users/4',expect.not.objectContaining({department_id:expect.anything()}));});
