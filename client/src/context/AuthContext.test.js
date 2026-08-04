import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function AuthProbe({ onState }) {
  onState(useAuth());
  return null;
}

test('does not authenticate from a stored JWT until the server confirms its session', async () => {
  localStorage.setItem('jwt', 'stored-token');
  jwtDecode.mockReturnValue({ id: 7, role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 });
  const sessionRequest = deferred();
  axios.get.mockReturnValue(sessionRequest.promise);
  const observedStates = [];
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(<AuthProvider><AuthProbe onState={(state) => observedStates.push(state)} /></AuthProvider>);
  });

  expect(axios.get).toHaveBeenCalledWith('/api/auth/session-status');
  expect(observedStates.at(-1).loading).toBe(true);
  expect(observedStates.at(-1).isAuthenticated).toBe(false);

  await act(async () => {
    sessionRequest.resolve({ data: { autoLoginQualified: false } });
    await sessionRequest.promise;
  });

  expect(observedStates.at(-1).loading).toBe(false);
  expect(observedStates.at(-1).isAuthenticated).toBe(true);
  expect(observedStates.at(-1).user.id).toBe(7);

  act(() => root.unmount());
});
