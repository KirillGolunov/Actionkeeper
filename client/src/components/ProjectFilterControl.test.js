import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ProjectFilterControl from './ProjectFilterControl';
import { defaultProjectFilters } from '../utils/projectFilters';
import { I18nProvider, useTranslation } from '../i18n/I18nProvider';

const dirs = [{ id: 1, is_system: 1, short_name: 'System' }, { id: 2, short_name: 'DEV' }];
function Harness({ departments = dirs, currentUser = { role: 'admin' }, optionsLoaded = true }) {
  const [filters, setFilters] = useState(defaultProjectFilters);
  const { setLocale } = useTranslation();
  return <><button onClick={() => setLocale('en')}>English</button><ProjectFilterControl filters={filters} onChange={setFilters} departments={departments} projects={[]} currentUser={currentUser} optionsLoaded={optionsLoaded} canReview pendingCount={2} /><output data-testid="state">{JSON.stringify(filters)}</output></>;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
beforeEach(() => { localStorage.setItem('locale', 'ru'); host=document.createElement('div'); document.body.appendChild(host); root=createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); localStorage.clear(); });
const state = () => JSON.parse(host.querySelector('output').textContent);
const item = name => [...document.querySelectorAll('[role="menuitem"]')].find(n=>n.getAttribute('aria-label')===name);
const click = async node => { expect(node).toBeTruthy(); await act(async()=>node.dispatchEvent(new MouseEvent('click',{bubbles:true}))); };
const setup = async props => { await act(async()=>root.render(<I18nProvider><Harness {...props}/></I18nProvider>)); };
const open = () => click(host.querySelector('[role="combobox"]'));

test('opening branches does not select; checkbox choices update immediately and keep submenu open', async () => {
  await setup(); await open(); await click(item('Статус'));
  expect(state().scope).toBe('all');
  await click(item('Закрытые'));
  expect(state().closed).toBe(true);
  expect(item('Закрытые')).toBeTruthy();
  expect(host.querySelector('[aria-label="Дополнительные фильтры: 1"]')).toBeTruthy();
});

test('single selection closes menu; unavailable department falls back without losing other filters', async () => {
  await setup(); await open(); await click(item('Статус')); await click(item('Закрытые'));
  await click(item('Подразделения')); await click(item('DEV'));
  expect(host.querySelector('[role="combobox"]').textContent).toContain('DEV');
  expect(document.querySelector('[role="menu"]')).toBeNull();
  await setup({departments:[dirs[0]]});
  expect(state()).toMatchObject({scope:'all',closed:true});
});

test('language change preserves submenu and selections; reset restores defaults', async () => {
  await setup(); await open(); await click(item('Категории')); await click(item('Без категории'));
  await click([...host.querySelectorAll('button')].find(n=>n.textContent==='English'));
  expect(item('Uncategorized')).toBeTruthy();
  expect(state().unclassified).toBe(true);
  await click(item('Reset'));
  expect(state()).toEqual(defaultProjectFilters());
});

test('Enter toggles a checkbox exactly once through the menu keyboard handler', async () => {
  await setup(); await open(); await click(item('Статус'));
  await act(async()=>item('Закрытые').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));
  expect(state().closed).toBe(true);
  expect(item('Закрытые')).toBeTruthy();
});

test('initial department comes from managed departments before own and does not reset manual choice', async () => {
  const currentUser={role:'user',department_id:1,managedDepartmentIds:[2]};
  // Administrator catalog is used here so both departments are present without fixture projects.
  await setup({currentUser:{...currentUser,role:'admin'},optionsLoaded:false});
  expect(host.querySelector('[role="combobox"]').disabled).toBe(true);
  await setup({currentUser:{...currentUser,role:'admin'}});
  expect(state().scope).toBe('department:2');
  await open(); await click(item('Подразделения')); await click(item('Все проекты'));
  await setup({currentUser:{...currentUser,role:'admin'},departments:[...dirs]});
  expect(state().scope).toBe('all');
  await open(); await click(item('Сбросить'));
  expect(state().scope).toBe('department:2');
});
