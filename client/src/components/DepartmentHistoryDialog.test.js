import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import axios from 'axios';
import DepartmentHistoryDialog from './DepartmentHistoryDialog';
import {I18nProvider} from '../i18n/I18nProvider';
jest.mock('axios',()=>({get:jest.fn()}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
test('keeps archived assignment history but only offers active departments for a transfer',async()=>{
 localStorage.setItem('locale','ru');
 axios.get.mockImplementation(url=>Promise.resolve({data:url==='/api/departments'?[{id:1,name:'Active department',short_name:'ACT'},{id:2,name:'Archived department',short_name:'OLD',archived_at:'2026-01-01'}]:[{id:7,department_id:2,name:'Archived department',short_name:'OLD',is_initial:1,effective_from:null,effective_to:null}]}));
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host);
 try{
 await act(async()=>root.render(<I18nProvider><DepartmentHistoryDialog user={{id:4,name:'Employee'}} onClose={jest.fn()}/></I18nProvider>));
 expect(document.querySelector('tbody').textContent).toContain('OLD');
 await act(async()=>document.querySelector('[role="combobox"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0})));
 const options=[...document.querySelectorAll('[role="option"]')].map(node=>node.textContent);
 expect(options).toEqual(['ACT']);
 }finally{act(()=>root.unmount());host.remove();localStorage.clear();jest.clearAllMocks();}
});
