import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Analytics from './Analytics';
import { useAuth } from '../context/AuthContext';
import { I18nProvider } from '../i18n/I18nProvider';

jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/TeamDashboard', () => (props) => <output data-testid="team-dashboard" onClick={() => props.onOpenProject(17)}>{props.selectedSubject}:{props.teamView}</output>);
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
