import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import HomeUserControl, { getUserDisplayName } from './HomeUserControl';
import { I18nProvider } from '../i18n/I18nProvider';

const admin = { id: 1, name: 'Кирилл', surname: 'Голунов', role: 'admin' };
const users = [
  admin,
  { id: 2, name: 'Анна', surname: 'Иванова', role: 'user' },
  { id: 3, name: 'Пётр', surname: 'Смирнов', role: 'user' },
  { id: 4, name: 'Мария', surname: 'Петрова', role: 'user' },
  { id: 5, name: 'Илья', surname: 'Кузнецов', role: 'user' },
  { id: 6, name: 'Ольга', surname: 'Соколова', role: 'user', deleted: 1 },
];

function renderControl(props) {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<I18nProvider><HomeUserControl {...props} /></I18nProvider>));
  return {
    host,
    root,
    cleanup() {
      act(() => root.unmount());
      host.remove();
      delete window.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}

test('formats a user as surname and name', () => {
  expect(getUserDisplayName(admin)).toBe('Голунов Кирилл');
});

test('shows only the current name for a regular user', () => {
  const view = renderControl({ currentUser: { ...admin, role: 'user' }, value: 1 });
  expect(view.host.textContent).toBe('Голунов Кирилл');
  expect(view.host.querySelector('[role="combobox"]')).toBeNull();
  expect(view.host.querySelector('[aria-label="Текущий пользователь: Голунов Кирилл"]')).not.toBeNull();
  view.cleanup();
});

test('supports a forced dropdown for the team view of a regular user', () => {
  const currentUser = { ...admin, role: 'user' };
  const onChange = jest.fn();
  const view = renderControl({
    currentUser,
    users: [{ id: 'team', name: 'Вся команда' }, currentUser],
    value: 'team',
    onChange,
    forceDropdown: true,
  });

  const trigger = view.host.querySelector('[role="combobox"]');
  expect(trigger).not.toBeNull();
  act(() => Simulate.click(trigger));
  const options = document.body.querySelectorAll('[role="option"]');
  expect(options).toHaveLength(2);
  expect(options[0].textContent).toContain('Вся команда');

  act(() => Simulate.click(options[1]));
  expect(onChange).toHaveBeenCalledWith(currentUser.id);
  view.cleanup();
});

test('opens a five-row-high admin dropdown and selects a user', () => {
  const onChange = jest.fn();
  const view = renderControl({ currentUser: admin, users, value: 1, onChange });
  const trigger = view.host.querySelector('[role="combobox"]');
  expect(trigger.querySelector('[data-testid="KeyboardArrowDownRoundedIcon"]')).not.toBeNull();
  act(() => Simulate.click(trigger));

  const listbox = document.body.querySelector('[role="listbox"]');
  const options = document.body.querySelectorAll('[role="option"]');
  expect(options).toHaveLength(6);
  expect(getComputedStyle(listbox).maxHeight).toBe('220px');
  expect(getComputedStyle(options[0]).height).toBe('44px');
  expect(document.body.textContent).toContain('Удалён');

  act(() => Simulate.click(options[1]));
  expect(onChange).toHaveBeenCalledWith(2);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  view.cleanup();
});

test('closes the admin dropdown with Escape and disables it on an error', () => {
  const view = renderControl({ currentUser: admin, users, value: 1, onChange: jest.fn() });
  const trigger = view.host.querySelector('[role="combobox"]');
  act(() => Simulate.keyDown(trigger, { key: 'ArrowDown' }));
  const listbox = document.body.querySelector('[role="listbox"]');
  expect(listbox).not.toBeNull();
  act(() => Simulate.keyDown(listbox, { key: 'Escape' }));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  view.cleanup();

  const errorView = renderControl({ currentUser: admin, users: [], value: 1, error: 'failed' });
  expect(errorView.host.querySelector('[role="combobox"]').hasAttribute('disabled')).toBe(true);
  errorView.cleanup();
});

test('supports an explicitly disabled team selector', () => {
  const view = renderControl({ currentUser: admin, users, value: 1, onChange: jest.fn(), disabled: true });
  expect(view.host.querySelector('[role="combobox"]').hasAttribute('disabled')).toBe(true);
  view.cleanup();
});
