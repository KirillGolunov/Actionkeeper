import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { I18nProvider } from '../i18n/I18nProvider';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

test('places Analytics between notifications and projects in sidebar navigation', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('locale', 'ru');
  useAuth.mockReturnValue({ user: { id: 1, role: 'admin', name: 'Админ', surname: 'Тестов' }, logout: jest.fn() });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<I18nProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AppSidebar collapsed={false} mobile={false} mobileOpen={false} unreadCount={0} notificationsOpen={false} onToggle={jest.fn()} onNotifications={jest.fn()} onMobileClose={jest.fn()} /><LocationProbe /></MemoryRouter></I18nProvider>);
  });
  const labels = [...host.querySelectorAll('button')].map((button) => button.textContent.trim());
  expect(labels.indexOf('Уведомления')).toBeLessThan(labels.indexOf('Аналитика'));
  expect(labels.indexOf('Аналитика')).toBeLessThan(labels.indexOf('Проекты'));
  act(() => root.unmount());
  host.remove();
  localStorage.removeItem('locale');
  delete window.IS_REACT_ACT_ENVIRONMENT;
});
