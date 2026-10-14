import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import axios from 'axios';
import Home from './Home';
import { useAuth } from '../context/AuthContext';
import { I18nProvider } from '../i18n/I18nProvider';

jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/TeamDashboard', () => () => <div>TEAM_DASHBOARD</div>);
jest.mock('./TimeEntries', () => (props) => <div data-testid="mock-time-entries">
  user={String(props.selectedUserId)};week={String(props.weekAnchor || '')}
  <button type="button" onClick={() => props.onDirtyChange(true)}>MAKE_DIRTY</button>
  <button type="button" onClick={() => props.onWeekChange(new Date(2026, 0, 12))}>CHANGE_WEEK</button>
</div>);

const admin = { id: 1, name: 'Админ', surname: 'Тестов', role: 'admin' };
const employee = { id: 2, name: 'Иван', surname: 'Иванов', role: 'user', deleted: 0 };

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

async function renderHome(initialEntry, user = admin, selectionData = [admin, employee]) {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  useAuth.mockReturnValue({ user });
  axios.get.mockResolvedValue({ data: selectionData });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <I18nProvider><Routes><Route path="/" element={<><Home /><LocationProbe /></>} /></Routes></I18nProvider>
      </MemoryRouter>
    );
    await Promise.resolve();
  });
  return {
    host,
    cleanup() {
      act(() => root.unmount());
      host.remove();
      delete window.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}

test('opens a deep-linked employee and week and keeps week changes in the URL', async () => {
  const view = await renderHome('/?mode=mine&userId=2&week=2026-01-05');
  expect(view.host.querySelector('[data-testid="mock-time-entries"]').textContent).toContain('user=2;week=2026-01-05T12:00:00');

  const changeWeek = [...view.host.querySelectorAll('button')].find((button) => button.textContent === 'CHANGE_WEEK');
  act(() => Simulate.click(changeWeek));
  expect(view.host.querySelector('[data-testid="location"]').textContent).toContain('mode=mine');
  expect(view.host.querySelector('[data-testid="location"]').textContent).toContain('userId=2');
  expect(view.host.querySelector('[data-testid="location"]').textContent).toContain('week=2026-01-12');
  view.cleanup();
});

test('ignores a foreign user id for a regular user', async () => {
  const regularUser = { ...admin, role: 'user' };
  const view = await renderHome('/?mode=mine&userId=2&week=2026-01-05', regularUser);
  expect(view.host.querySelector('[data-testid="mock-time-entries"]').textContent).toContain('user=1');
  expect(view.host.querySelector('[data-testid="location"]').textContent).not.toContain('userId=2');
  view.cleanup();
});

test('canceling a nested employee selection preserves the current employee and dirty hours',async()=>{
 const confirm=jest.spyOn(window,'confirm').mockReturnValue(false);
 const view=await renderHome('/?mode=mine&userId=1&week=2026-01-05',admin,{managedDepartmentIds:[2],departments:[{id:2,name:'Engineering',short_name:'ENG',users:[employee]}]});
 const click=async node=>{await act(async()=>node.dispatchEvent(new MouseEvent('click',{bubbles:true})));};
 try{
 await click([...view.host.querySelectorAll('button')].find(node=>node.textContent==='MAKE_DIRTY'));
 await click(view.host.querySelector('[role="combobox"]'));
 await click(document.querySelector('[role="menuitem"][aria-label="ENG"]'));
 expect(confirm).not.toHaveBeenCalled();
 await click(document.querySelector('[role="menuitem"][aria-label="Иванов Иван"]'));
 expect(confirm).toHaveBeenCalledTimes(1);
 expect(view.host.querySelector('[data-testid="mock-time-entries"]').textContent).toContain('user=1');
 expect(view.host.querySelector('[data-testid="location"]').textContent).toContain('userId=1');
 }finally{confirm.mockRestore();view.cleanup();}
});
