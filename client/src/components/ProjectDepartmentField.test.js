jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ProjectDepartmentField from './ProjectDepartmentField';
import ProjectDetailsForm from './ProjectDetailsForm';
import { I18nProvider } from '../i18n/I18nProvider';
import { getDepartmentChipSx } from '../utils/departmentColors';
const departments = [{ id: 1, name: 'Без подразделения', short_name: 'Без подразделения', is_system: 1 }, { id: 2, name: 'Development department', short_name: 'DEV' }, { id: 3, name: 'Design department', short_name: 'DES' }];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
const press = async (node, type = 'click') => { await act(async () => node.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 }))); };
async function mount(props = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<I18nProvider><ProjectDepartmentField departments={departments} value={[1]} canEdit inline {...props} /></I18nProvider>));
}
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
async function open() { await press(host.querySelector('[role="combobox"]'), 'mousedown'); }
const option = name => [...document.querySelectorAll('[role="option"]')].find(node => node.getAttribute('aria-label') === name);
async function close() { await act(async () => document.querySelector('[role="listbox"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); }
test('colors depend on department ID rather than name and distinguish departments', () => {
  expect(getDepartmentChipSx(departments[1])).toEqual(getDepartmentChipSx({ ...departments[1], name: 'Renamed', short_name: 'NEW' }));
  expect(getDepartmentChipSx(departments[1])).not.toEqual(getDepartmentChipSx(departments[2]));
  expect(getDepartmentChipSx(departments[0]).backgroundColor).toBe('#F6F8FA');
});
test('checkbox selections stay open and save once when the list closes', async () => {
  const onSave = jest.fn().mockResolvedValue({ ok: true }); await mount({ onSave });
  await open(); await press(option('Development department')); await press(option('Design department'));
  expect(document.querySelector('[role="listbox"]')).toBeTruthy();
  expect(option('Без подразделения').getAttribute('aria-selected')).toBe('false');
  expect(onSave).not.toHaveBeenCalled();
  expect(host.textContent).toContain('DEV'); expect(host.textContent).toContain('DES');
  await close(); expect(onSave).toHaveBeenCalledTimes(1); expect(onSave).toHaveBeenCalledWith('departmentIds', [2,3]);
});
test('failed save retains the draft and supports retry and cancellation through the field ref', async () => {
  const field = React.createRef(); const onSave = jest.fn().mockResolvedValue({ ok: false, error: 'Server refused' });
  await mount({ onSave, ref: field }); await open(); await press(option('Development department')); await close();
  expect(host.textContent).toContain('DEV'); expect(host.textContent).toContain('Server refused');
  expect(field.current.isEditing()).toBe(true);
  let allowed; await act(async () => { allowed = await field.current.commit(); }); expect(allowed).toBe(false);
  expect(onSave).toHaveBeenCalledTimes(2);
  await act(async () => field.current.cancel()); expect(host.textContent).toContain('Без подразделения'); expect(host.textContent).not.toContain('Server refused');
});
test('empty selection cannot be committed and remains editable', async () => {
  const field = React.createRef(); const onSave = jest.fn(); await mount({ ref: field, onSave });
  await open(); await press(option('Без подразделения')); await close();
  expect(onSave).not.toHaveBeenCalled(); expect(host.querySelector('[role="alert"]')).toBeTruthy();
  let allowed; await act(async () => { allowed = await field.current.commit(); }); expect(allowed).toBe(false);
});
test('creation uses a draft without calling save, while read-only mode has no selector', async () => {
  const onChange = jest.fn(); const onSave = jest.fn(); await mount({ inline: false, onChange, onSave });
  await open(); await press(option('Development department')); await close();
  expect(onChange).toHaveBeenCalledWith([2]); expect(onSave).not.toHaveBeenCalled();
  await act(async () => root.render(<I18nProvider><ProjectDepartmentField departments={departments} value={[2]} canEdit={false} /></I18nProvider>));
  expect(host.querySelector('[role="combobox"]')).toBeNull(); expect(host.textContent).toContain('DEV');
});

test('project details place unified departments after the client and block an empty draft before editing another field', async () => {
  const form = React.createRef(); const save = jest.fn();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const labels = { sectionTitle: 'Project details', category: 'Category', client: 'Client', name: 'Name', code: 'Code', manager: 'Manager', description: 'Description', unassigned: 'Unassigned', retry: 'Retry', revert: 'Revert' };
  await act(async () => root.render(<I18nProvider><ProjectDetailsForm ref={form} value={{ name: 'Original', client_id: 1, category: 'internal', departments: [departments[0]] }} onChange={jest.fn()} canEdit inline onSaveField={save} departments={departments} clients={[{ id: 1, name: 'Client name' }]} managerCandidates={[]} categoryOptions={[{ value: 'internal', label: 'Internal' }]} labels={labels} /></I18nProvider>));
  const text = host.textContent; expect(text.indexOf('Client name')).toBeLessThan(text.indexOf('Подразделения')); expect(text.indexOf('Подразделения')).toBeLessThan(text.indexOf('Original'));
  await press(host.querySelector('[aria-label="Настроить подразделения"]'));
  await press(document.querySelector('[role="menuitem"][aria-label="Добавить участников"]'));
  await press(document.querySelector('[role="menuitem"][aria-label="Без подразделения"]'));
  expect([...document.querySelectorAll('button')].find(b => b.textContent === 'Применить')).toBeUndefined();
  await act(async () => { expect(await form.current.commitActive()).toBe(false); });
  await press([...host.querySelectorAll('button')].find(button => button.textContent.includes('Original')));
  expect(host.querySelector('#project-field-name')).toBeNull();
  act(() => form.current.cancelActive()); expect(host.textContent).toContain('Без подразделения'); expect(save).not.toHaveBeenCalled();
});
