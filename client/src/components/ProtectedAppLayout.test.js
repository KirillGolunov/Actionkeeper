import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ProtectedAppLayout from './ProtectedAppLayout';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderLayout(authState) {
  useAuth.mockReturnValue(authState);
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProtectedAppLayout>
          <div>PROTECTED_PRODUCT_CONTENT</div>
        </ProtectedAppLayout>
      </MemoryRouter>
    );
  });
  const html = container.innerHTML;
  act(() => root.unmount());
  return html;
}

test('shows only a neutral loader while the server validates the session', () => {
  const html = renderLayout({ loading: true, isAuthenticated: false, authError: null });

  expect(html).toContain('role="progressbar"');
  expect(html).not.toContain('PROTECTED_PRODUCT_CONTENT');
});

test('does not render protected content for an unauthenticated user', () => {
  const html = renderLayout({ loading: false, isAuthenticated: false, authError: null });

  expect(html).not.toContain('PROTECTED_PRODUCT_CONTENT');
});

test('renders protected content only after authentication is confirmed', () => {
  const html = renderLayout({ loading: false, isAuthenticated: true, authError: null });

  expect(html).toContain('PROTECTED_PRODUCT_CONTENT');
});
